"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

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

export function RecordsBoard({ initialRecords }: { initialRecords: RecordListItem[] }) {
  const [statusFilter, setStatusFilter] = useState<"ALL" | RecordStatus>("ALL");

  const records = useMemo(() => {
    if (statusFilter === "ALL") return initialRecords;
    return initialRecords.filter((item) => item.status === statusFilter);
  }, [initialRecords, statusFilter]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-base">Filtros</CardTitle>
          <CardDescription>Filtra por estatus para ubicar fichas rapidamente.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Estatus</div>
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
              <p className="text-sm text-slate-500">No hay fichas para el filtro seleccionado.</p>
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
              <div className="text-xs text-slate-500">
                v{item.version} · Area: {item.currentArea} · Owner: {item.moduleOwner}
              </div>
              <div className="text-xs text-slate-500">
                Evidencias: {item._count.evidences} · Documentos: {item._count.artifacts}
              </div>
              <div className="text-xs text-slate-500">
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
