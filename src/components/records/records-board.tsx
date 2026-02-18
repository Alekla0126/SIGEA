"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { canDeleteRecord, canPurgeRecord, canRestoreRecord } from "@/lib/client-rbac";
import type { RecordStatus, Role } from "@/lib/types";
import { recordStatusLabel } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";

type RecordListItem = {
  id: string;
  status: RecordStatus;
  version: number;
  moduleOwner: "FLAGRANCIA" | "MP";
  currentArea: "FLAGRANCIA" | "LITIGACION" | "SUPERVISION";
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
    role: Role;
  };
  case: {
    id: string;
    folio: string;
    title: string;
  };
  deletedAt?: string | null;
  _count: {
    evidences: number;
    artifacts: number;
  };
};

const STATUS_OPTIONS: Array<{ value: "ALL" | RecordStatus; label: string }> = [
  { value: "ALL", label: "Todas" },
  { value: "DRAFT", label: recordStatusLabel("DRAFT") },
  { value: "READY", label: recordStatusLabel("READY") },
  { value: "NEEDS_CHANGES", label: recordStatusLabel("NEEDS_CHANGES") },
  { value: "APPROVED", label: recordStatusLabel("APPROVED") },
];

export function RecordsBoard({
  role,
  initialRecords,
  initialTrashRecords,
}: {
  role: Role;
  initialRecords: RecordListItem[];
  initialTrashRecords: RecordListItem[];
}) {
  const router = useRouter();
  const [view, setView] = useState<"active" | "trash">("active");
  const [statusFilter, setStatusFilter] = useState<"ALL" | RecordStatus>("ALL");
  const [activeRecords, setActiveRecords] = useState(initialRecords);
  const [trashRecords, setTrashRecords] = useState(initialTrashRecords);

  const records = useMemo(() => {
    const list = view === "trash" ? trashRecords : activeRecords;
    if (statusFilter === "ALL") return list;
    return list.filter((item) => item.status === statusFilter);
  }, [activeRecords, statusFilter, trashRecords, view]);

  const moveToTrash = async (recordId: string) => {
    if (!confirm("Enviar la ficha a papelera?")) {
      return;
    }

    try {
      const res = await fetch(`/api/records/${recordId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo enviar a papelera");
      }
      const moved = activeRecords.find((item) => item.id === recordId);
      setActiveRecords((prev) => prev.filter((item) => item.id !== recordId));
      if (moved) {
        setTrashRecords((prev) => [{ ...moved, deletedAt: new Date().toISOString() }, ...prev]);
      }
      toast.success("Ficha enviada a papelera");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    }
  };

  const restoreFromTrash = async (recordId: string) => {
    try {
      const res = await fetch(`/api/records/${recordId}/restore`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo restaurar");
      }
      const restored = trashRecords.find((item) => item.id === recordId);
      setTrashRecords((prev) => prev.filter((item) => item.id !== recordId));
      if (restored) {
        setActiveRecords((prev) => [{ ...restored, deletedAt: null }, ...prev]);
      }
      toast.success("Ficha restaurada");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    }
  };

  const purgeFromTrash = async (recordId: string) => {
    if (!confirm("Borrar definitivamente la ficha? Esta accion no se puede deshacer.")) {
      return;
    }

    try {
      const res = await fetch(`/api/records/${recordId}/purge`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo borrar definitivamente");
      }
      setTrashRecords((prev) => prev.filter((item) => item.id !== recordId));
      toast.success("Ficha borrada definitivamente");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={view === "active" ? "default" : "outline"}
          onClick={() => setView("active")}
        >
          Fichas activas
        </Button>
        <Button
          type="button"
          size="sm"
          variant={view === "trash" ? "default" : "outline"}
          onClick={() => setView("trash")}
        >
          <Trash2 className="h-4 w-4" /> Papelera
        </Button>
      </div>

      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-base">Filtros</CardTitle>
          <CardDescription>
            {view === "trash"
              ? "Papelera de fichas: restaura o borra definitivamente."
              : "Filtra por estatus para ubicar fichas rapidamente."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estatus</div>
            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "ALL" | RecordStatus)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <Link href="/cases">
              <Button variant="outline">Ir a casos</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {records.length === 0 ? (
          <Card className="md:col-span-2 xl:col-span-3">
            <CardContent className="py-8">
              <p className="text-sm text-muted-foreground">
                {view === "trash" ? "No hay fichas en papelera." : "No hay fichas para el filtro seleccionado."}
              </p>
            </CardContent>
          </Card>
        ) : null}

        {records.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Ficha {item.id.slice(0, 8)}</CardTitle>
                  <CardDescription>
                    Caso: {item.case.folio} · {item.case.title}
                  </CardDescription>
                </div>
                <StatusBadge status={item.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-muted-foreground">
                v{item.version} · Area: {item.currentArea} · Owner: {item.moduleOwner}
              </div>
              {view === "trash" && item.deletedAt ? (
                <div className="text-xs text-muted-foreground">
                  En papelera: {new Date(item.deletedAt).toLocaleString()}
                </div>
              ) : null}
              <div className="text-xs text-muted-foreground">
                Evidencias: {item._count.evidences} · Documentos: {item._count.artifacts}
              </div>
              <div className="text-xs text-muted-foreground">
                Actualizada: {new Date(item.updatedAt).toLocaleString()}
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/records/${item.id}`}>
                  <Button size="sm">Abrir ficha</Button>
                </Link>
                <Link href={`/cases/${item.case.id}`}>
                  <Button size="sm" variant="outline">
                    Abrir caso
                  </Button>
                </Link>
                {view === "active" && canDeleteRecord(role) ? (
                  <Button size="sm" variant="destructive" onClick={() => moveToTrash(item.id)} title="Enviar a papelera">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
                {view === "trash" && canRestoreRecord(role) ? (
                  <Button size="sm" variant="outline" onClick={() => restoreFromTrash(item.id)} title="Restaurar ficha">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                ) : null}
                {view === "trash" && canPurgeRecord(role) ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => purgeFromTrash(item.id)}
                    title="Borrar definitivamente"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
