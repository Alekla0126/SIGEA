"use client";

import { Copy, Plus, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { canCreateRecord, canDeleteCase } from "@/lib/client-rbac";
import { emptyRecordForm } from "@/lib/client-schemas";
import { recordStatusLabel } from "@/lib/labels";
import type { RecordStatus, Role } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";

type CaseRecord = {
  id: string;
  status: "DRAFT" | "READY" | "NEEDS_CHANGES" | "APPROVED";
  moduleOwner: "FLAGRANCIA" | "MP";
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
    role: Role;
  };
  statusTransitions: {
    id: string;
    fromStatus: RecordStatus;
    toStatus: RecordStatus;
    comment: string;
    createdAt: string;
    changedByUser: {
      id: string;
      name: string;
      role: Role;
    };
  }[];
};

type CaseDetail = {
  id: string;
  folio: string;
  title: string;
  description: string;
  deletedAt?: string | null;
  records: CaseRecord[];
  audits: {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    createdAt: string;
    user: {
      name: string;
      role: Role;
    };
  }[];
};

export function CaseDetailView({
  data,
  role,
}: {
  data: CaseDetail;
  role: Role;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [cloningId, setCloningId] = useState<string>("");
  const inTrash = Boolean(data.deletedAt);

  const trashCase = async () => {
    if (
      !confirm(
        "Enviar el caso a la papelera? Podras restaurarlo o borrarlo definitivamente desde la papelera.",
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/cases/${data.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo borrar caso");
      }
      toast.success("Caso enviado a papelera");
      router.replace("/cases");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    }
  };

  const restoreCase = async () => {
    try {
      const res = await fetch(`/api/cases/${data.id}/restore`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo restaurar caso");
      }
      toast.success("Caso restaurado");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    }
  };

  const purgeCase = async () => {
    if (!confirm("Borrar definitivamente? Esta accion no se puede deshacer.")) {
      return;
    }

    try {
      const res = await fetch(`/api/cases/${data.id}/purge`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo borrar definitivamente");
      }
      toast.success("Caso borrado definitivamente");
      router.replace("/cases");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    }
  };

  const createRecord = async () => {
    if (inTrash) {
      toast.error("No se puede crear fichas en un caso en papelera. Restaura el caso primero.");
      return;
    }

    setCreating(true);
    try {
      const moduleOwner = role === "MP" ? "MP" : "FLAGRANCIA";
      const response = await fetch(`/api/cases/${data.id}/records`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payload: {
            ...emptyRecordForm,
            observaciones: {
              ...emptyRecordForm.observaciones,
            },
          },
          moduleOwner,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "No se pudo crear ficha");
      }

      toast.success(`Ficha creada en estado ${recordStatusLabel("DRAFT")}`);
      router.push(`/records/${json.data.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setCreating(false);
    }
  };

  const cloneRecord = async (recordId: string) => {
    if (inTrash) {
      toast.error("No se puede clonar fichas en un caso en papelera. Restaura el caso primero.");
      return;
    }

    setCloningId(recordId);
    try {
      const response = await fetch(`/api/records/${recordId}/clone`, {
        method: "POST",
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "No se pudo clonar ficha");
      }

      toast.success(`Ficha clonada en estado ${recordStatusLabel("DRAFT")}`);
      router.push(`/records/${json.data.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setCloningId("");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {data.folio} · {data.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{data.description || "Sin descripcion"}</p>
          {inTrash ? (
            <div className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
              Este caso esta en papelera{data.deletedAt ? ` desde ${new Date(data.deletedAt).toLocaleString()}` : ""}. Puedes restaurarlo o borrarlo definitivamente.
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {canCreateRecord(role) && !inTrash ? (
              <Button onClick={createRecord} disabled={creating}>
                <Plus className="h-4 w-4" /> {creating ? "Creando ficha..." : "Crear ficha"}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                {inTrash
                  ? "No se pueden crear fichas mientras el caso este en papelera."
                  : "Tu rol no puede crear fichas. Solo puedes revisar/editar existentes."}
              </p>
            )}
            {canDeleteCase(role) ? (
              inTrash ? (
                <>
                  <Button variant="outline" onClick={restoreCase} title="Restaurar caso">
                    <RotateCcw className="h-4 w-4" /> Restaurar
                  </Button>
                  <Button variant="destructive" onClick={purgeCase} title="Borrar definitivamente">
                    <Trash2 className="h-4 w-4" /> Borrar definitivo
                  </Button>
                </>
              ) : (
                <Button variant="destructive" onClick={trashCase} title="Enviar caso a papelera">
                  <Trash2 className="h-4 w-4" /> Enviar a papelera
                </Button>
              )
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fichas del caso (timeline)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.records.length === 0 ? <p className="text-sm text-muted-foreground">Aun no hay fichas.</p> : null}
          {data.records.map((record) => (
            <div key={record.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">Ficha {record.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">
                    Owner: {record.moduleOwner} · v{record.version} · {new Date(record.updatedAt).toLocaleString()}
                  </p>
                </div>
                <StatusBadge status={record.status} />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Link href={`/records/${record.id}`}>
                  <Button size="sm">Abrir ficha</Button>
                </Link>
                {canCreateRecord(role) && !inTrash ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => cloneRecord(record.id)}
                    disabled={Boolean(cloningId)}
                    title="Crear una nueva ficha copiando la informacion de esta"
                  >
                    <Copy className="h-4 w-4" />
                    {cloningId === record.id ? "Clonando..." : "Clonar"}
                  </Button>
                ) : null}
              </div>
              {record.statusTransitions.length > 0 ? (
                <div className="mt-4 space-y-2 rounded-md bg-muted p-3">
                  {record.statusTransitions.map((transition) => (
                    <p key={transition.id} className="text-xs text-muted-foreground">
                      {new Date(transition.createdAt).toLocaleString()} · {transition.changedByUser.name} ·{" "}
                      {recordStatusLabel(transition.fromStatus)} -&gt; {recordStatusLabel(transition.toStatus)}
                      {transition.comment ? ` (${transition.comment})` : ""}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Auditoria reciente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.audits.length === 0 ? <p className="text-sm text-muted-foreground">Sin eventos registrados.</p> : null}
          {data.audits.slice(0, 20).map((audit) => (
            <p key={audit.id} className="text-xs text-muted-foreground">
              {new Date(audit.createdAt).toLocaleString()} · {audit.action} {audit.entityType} · {audit.user.name}
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
