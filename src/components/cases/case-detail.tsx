"use client";

import { Copy, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { canCreateRecord } from "@/lib/client-rbac";
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

  const createRecord = async () => {
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
              relevancia: undefined,
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
          {canCreateRecord(role) ? (
            <Button onClick={createRecord} disabled={creating}>
              <Plus className="h-4 w-4" /> {creating ? "Creando ficha..." : "Crear ficha"}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">Tu rol no puede crear fichas. Solo puedes revisar/editar existentes.</p>
          )}
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
                {canCreateRecord(role) ? (
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
