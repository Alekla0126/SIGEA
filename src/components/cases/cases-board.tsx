"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { canCreateCase, canDeleteCase } from "@/lib/client-rbac";
import { caseFormSchema } from "@/lib/client-schemas";
import type { CaseItem, Role } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/badge";

const schema = caseFormSchema;
type FormInput = z.infer<typeof schema>;

export function CasesBoard({
  initialCases,
  role,
}: {
  initialCases: CaseItem[];
  role: Role;
}) {
  const router = useRouter();
  const [view, setView] = useState<"active" | "trash">("active");
  const [activeCases, setActiveCases] = useState(initialCases);
  const [trashCases, setTrashCases] = useState<CaseItem[]>([]);
  const [loadingTrash, setLoadingTrash] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Mantener la lista activa sincronizada con el SSR (router.refresh).
    setActiveCases(initialCases);
  }, [initialCases]);

  const form = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      folio: "",
      title: "",
      description: "",
    },
  });

  const cases = view === "trash" ? trashCases : activeCases;

  const latestStatusLabel = useMemo(
    () =>
      cases.reduce<Record<string, string>>((acc, oneCase) => {
        const latest = oneCase.records[0]?.status ?? "DRAFT";
        acc[oneCase.id] = latest;
        return acc;
      }, {}),
    [cases],
  );

  const loadTrash = async () => {
    setLoadingTrash(true);
    try {
      const res = await fetch("/api/cases?trash=1");
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo cargar la papelera");
      }
      setTrashCases(json.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setLoadingTrash(false);
    }
  };

  const onCreate = form.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo crear caso");
      }

      setActiveCases((prev) => [
        {
          ...json.data,
          createdBy: { id: "", name: "Actual", role },
          records: [],
          _count: { records: 0 },
        },
        ...prev,
      ]);
      form.reset();
      toast.success("Caso creado");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setSubmitting(false);
    }
  });

  const onTrash = async (id: string) => {
    if (
      !confirm(
        "Enviar el caso a la papelera? Podras restaurarlo o borrarlo definitivamente desde la papelera.",
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/cases/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo borrar");
      }
      setActiveCases((prev) => prev.filter((item) => item.id !== id));
      toast.success("Caso enviado a papelera");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    }
  };

  const onRestore = async (id: string) => {
    try {
      const res = await fetch(`/api/cases/${id}/restore`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo restaurar");
      }
      setTrashCases((prev) => prev.filter((item) => item.id !== id));
      toast.success("Caso restaurado");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    }
  };

  const onPurge = async (id: string) => {
    if (!confirm("Borrar definitivamente? Esta accion no se puede deshacer.")) {
      return;
    }

    try {
      const res = await fetch(`/api/cases/${id}/purge`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo borrar definitivamente");
      }
      setTrashCases((prev) => prev.filter((item) => item.id !== id));
      toast.success("Caso borrado definitivamente");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={view === "active" ? "default" : "outline"}
            onClick={() => setView("active")}
          >
            Casos activos
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === "trash" ? "default" : "outline"}
            onClick={async () => {
              setView("trash");
              await loadTrash();
            }}
          >
            <Trash2 className="h-4 w-4" /> Papelera
          </Button>
        </div>
        {view === "trash" ? (
          <div className="text-xs text-muted-foreground">
            {loadingTrash ? "Cargando..." : `${trashCases.length} en papelera`}
          </div>
        ) : null}
      </div>

      {view === "active" && canCreateCase(role) ? (
        <Card>
          <CardHeader>
            <CardTitle>Nuevo caso</CardTitle>
            <CardDescription>Flagrancia y MP pueden crear casos base para iniciar fichas.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-3" onSubmit={onCreate}>
              <div className="space-y-2">
                <Label htmlFor="folio">Folio</Label>
                <Input id="folio" placeholder="SIGEA-2026-001" {...form.register("folio")} />
                {form.formState.errors.folio ? (
                  <p className="text-xs text-rose-600">{form.formState.errors.folio.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Titulo</Label>
                <Input id="title" placeholder="Audiencia inicial" {...form.register("title")} />
                {form.formState.errors.title ? (
                  <p className="text-xs text-rose-600">{form.formState.errors.title.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripcion</Label>
                <Input id="description" placeholder="Resumen breve" {...form.register("description")} />
              </div>
              <div className="md:col-span-3">
                <Button type="submit" disabled={submitting}>
                  <Plus className="h-4 w-4" />
                  {submitting ? "Creando..." : "Crear caso"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cases.length === 0 ? (
          <Card className="md:col-span-2 xl:col-span-3">
            <CardContent className="py-8">
              <p className="text-sm text-muted-foreground">
                {view === "trash" ? "La papelera esta vacia." : "No hay casos registrados."}
              </p>
            </CardContent>
          </Card>
        ) : null}
        {cases.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{item.folio}</CardTitle>
                  <CardDescription>{item.title}</CardDescription>
                </div>
                <StatusBadge status={(latestStatusLabel[item.id] as "DRAFT" | "READY" | "NEEDS_CHANGES" | "APPROVED") || "DRAFT"} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{item.description || "Sin descripcion"}</p>
              <div className="text-xs text-muted-foreground">
                Fichas: {item._count.records} · Creado por {item.createdBy.name}
                {view === "trash" && item.deletedAt ? ` · En papelera: ${new Date(item.deletedAt).toLocaleString()}` : ""}
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/cases/${item.id}`}>
                  <Button size="sm">Abrir caso</Button>
                </Link>
                {view === "active" && canDeleteCase(role) ? (
                  <Button size="sm" variant="destructive" onClick={() => onTrash(item.id)} title="Enviar a papelera">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
                {view === "trash" && canDeleteCase(role) ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => onRestore(item.id)} title="Restaurar caso">
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => onPurge(item.id)} title="Borrar definitivamente">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
