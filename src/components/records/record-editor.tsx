"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, ChevronRight, Download, FileDown, RotateCcw, Save, Send, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  allowedTransitions,
  canDeleteRecord,
  canUpdateRecord,
} from "@/lib/client-rbac";
import { emptyRecordForm, recordFormSchema, type RecordFormInput } from "@/lib/client-schemas";
import { recordStatusLabel } from "@/lib/labels";
import type { RecordStatus, Role } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

type RecordEditorData = {
  id: string;
  status: "DRAFT" | "READY" | "NEEDS_CHANGES" | "APPROVED";
  version: number;
  currentArea: "FLAGRANCIA" | "LITIGACION" | "SUPERVISION";
  moduleOwner: "FLAGRANCIA" | "MP";
  deletedAt?: string | null;
  payload: unknown;
  case: {
    id: string;
    folio: string;
    title: string;
  };
  evidences: {
    id: string;
    originalName: string;
    contentType: string;
    sizeBytes: number;
    createdAt: string;
  }[];
  artifacts: {
    id: string;
    format: "PPTX" | "PDF";
    status: "READY" | "FAILED";
    fileName: string;
    createdAt: string;
  }[];
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

function inferAreaByRole(role: Role): "FLAGRANCIA" | "LITIGACION" | "SUPERVISION" {
  if (role === "LITIGACION") {
    return "LITIGACION";
  }

  if (role === "SUPERVISOR") {
    return "SUPERVISION";
  }

  return "FLAGRANCIA";
}

export function RecordEditor({
  record,
  role,
  litigacionReadyEnabled,
  litigacionCanDeleteEvidence,
}: {
  record: RecordEditorData;
  role: Role;
  litigacionReadyEnabled: boolean;
  litigacionCanDeleteEvidence: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState<"" | "pptx-mampara" | "pptx-tarjeta" | "pptx-ficha" | "pdf">("");
  const [stepIndex, setStepIndex] = useState(0);
  const stepsTopRef = useRef<HTMLDivElement | null>(null);
  const juecesDatalistId = `jueces-list-${record.id}`;
  const [juecesCatalogo, setJuecesCatalogo] = useState<Array<{ id: string; code: string; label: string; isActive: boolean }>>([]);
  const [medidasCatalogo, setMedidasCatalogo] = useState<Array<{ id: string; code: string; label: string; isActive: boolean }>>([]);

  const parsedPayload = recordFormSchema.safeParse(record.payload);
  const defaultValues = parsedPayload.success ? parsedPayload.data : emptyRecordForm;
  const inTrash = Boolean(record.deletedAt);

  const form = useForm<RecordFormInput>({
    resolver: zodResolver(recordFormSchema),
    defaultValues,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [juecesRes, medidasRes] = await Promise.all([
          fetch("/api/catalogs?category=JUEZ"),
          fetch("/api/catalogs?category=MEDIDA_CAUTELAR"),
        ]);

        const [juecesJson, medidasJson] = await Promise.all([juecesRes.json(), medidasRes.json()]);

        if (!juecesRes.ok) {
          throw new Error(juecesJson.error || "No se pudo cargar catalogo de jueces");
        }
        if (!medidasRes.ok) {
          throw new Error(medidasJson.error || "No se pudo cargar catalogo de medidas cautelares");
        }

        if (!cancelled) {
          setJuecesCatalogo((juecesJson.data || []).filter((item: any) => item && item.isActive));
          setMedidasCatalogo((medidasJson.data || []).filter((item: any) => item && item.isActive));
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Error");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const transitions = useMemo(() => {
    if (inTrash) return [];
    return allowedTransitions(role, record.status, litigacionReadyEnabled);
  }, [inTrash, role, record.status, litigacionReadyEnabled]);

  const editable = canUpdateRecord(role);

  const stepItems = [
    {
      title: "Encabezado",
      content: (
        <Section title="Encabezado">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Agencia">
              <Input {...form.register("agencyName")} disabled={!editable} />
            </Field>
            <Field label="Titulo del reporte">
              <Input {...form.register("reportTitle")} disabled={!editable} />
            </Field>
            <Field label="Version plantilla">
              <Input {...form.register("templateVersion")} disabled={!editable} />
            </Field>
          </div>
        </Section>
      ),
    },
    {
      title: "Expedientes",
      content: (
        <Section title="Expedientes">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="CDI">
              <Input {...form.register("expedientes.cdi")} disabled={!editable} />
            </Field>
            <Field label="CP">
              <Input {...form.register("expedientes.cp")} disabled={!editable} />
            </Field>
            <Field label="Carpeta judicial">
              <Input {...form.register("expedientes.carpetaJudicial")} disabled={!editable} />
            </Field>
            <Field label="Juicio oral">
              <Input {...form.register("expedientes.juicioOral")} disabled={!editable} />
            </Field>
          </div>
        </Section>
      ),
    },
    {
      title: "Fecha y hora",
      content: (
        <Section title="Fecha y hora">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Fecha">
              <Input placeholder="13 DE FEBRERO DE 2026" {...form.register("fechaHora.fecha")} disabled={!editable} />
            </Field>
            <Field label="Hora programada">
              <Input placeholder="HORA PROGRAMADA: 09:00" {...form.register("fechaHora.horaProgramada")} disabled={!editable} />
            </Field>
            <Field label="Hora inicio">
              <Input placeholder="09:15" {...form.register("fechaHora.horaInicio")} disabled={!editable} />
            </Field>
            <Field label="Hora termino">
              <Input placeholder="10:40" {...form.register("fechaHora.horaTermino")} disabled={!editable} />
            </Field>
          </div>
        </Section>
      ),
    },
    {
      title: "Delito",
      content: (
        <Section title="Delito">
          <Field label="Nombre del delito">
            <Input {...form.register("delito.nombre")} disabled={!editable} />
          </Field>
        </Section>
      ),
    },
    {
      title: "Imputado",
      content: (
        <Section title="Imputado">
          <Field label="Nombre completo">
            <Input {...form.register("imputado.nombreCompleto")} disabled={!editable} />
          </Field>
        </Section>
      ),
    },
    {
      title: "Ofendido",
      content: (
        <Section title="Ofendido">
          <Field label="Nombre completo">
            <Input {...form.register("ofendido.nombreCompleto")} disabled={!editable} />
          </Field>
        </Section>
      ),
    },
    {
      title: "Hecho",
      content: (
        <Section title="Hecho">
          <Field label={`Descripcion (min 20 para ${recordStatusLabel("READY")})`}>
            <Textarea rows={4} {...form.register("hecho.descripcion")} disabled={!editable} />
          </Field>
        </Section>
      ),
    },
    {
      title: "Tipo de audiencia / etapa",
      content: (
        <Section title="Tipo de audiencia / etapa">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Tipo audiencia">
              <Input {...form.register("audiencia.tipo")} disabled={!editable} />
            </Field>
            <Field label="Etapa">
              <Input {...form.register("audiencia.etapa")} disabled={!editable} />
            </Field>
            <Field label="Modalidad">
              <Input {...form.register("audiencia.modalidad")} disabled={!editable} />
            </Field>
          </div>
        </Section>
      ),
    },
    {
      title: "Autoridades",
      content: (
        <Section title="Autoridades">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Juez (catalogo con busqueda rapida, editable)">
              <Input
                list={juecesDatalistId}
                placeholder={juecesCatalogo.length > 0 ? "Escribe para buscar juez..." : "Captura nombre del juez"}
                {...form.register("autoridades.juez")}
                disabled={!editable}
              />
              <datalist id={juecesDatalistId}>
                {juecesCatalogo.map((item) => (
                  <option key={item.id} value={item.label} />
                ))}
              </datalist>
              <p className="text-xs text-muted-foreground">
                Puedes seleccionar del catalogo o escribir un juez nuevo manualmente.
              </p>
            </Field>
            <Field label="MP">
              <Input {...form.register("autoridades.mp")} disabled={!editable} />
            </Field>
            <Field label="Defensa">
              <Input {...form.register("autoridades.defensa")} disabled={!editable} />
            </Field>
            <Field label="Asesor juridico">
              <Input {...form.register("autoridades.asesorJuridico")} disabled={!editable} />
            </Field>
          </div>
          <Field label="Observacion">
            <Textarea rows={3} {...form.register("autoridades.observacion")} disabled={!editable} />
          </Field>
        </Section>
      ),
    },
    {
      title: "Resultado",
      content: (
        <Section title="Resultado">
          <Field label="Descripcion">
            <Textarea rows={3} {...form.register("resultado.descripcion")} disabled={!editable} />
          </Field>
        </Section>
      ),
    },
    {
      title: "Medida cautelar",
      content: (
        <Section title="Medida cautelar">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Catalogo (medidas cautelares)">
              {(() => {
                const normalize = (value: string) => value.replace(/\s+/g, " ").trim().toLowerCase();
                const current = normalize(form.watch("medidaCautelar.descripcion") || "");
                const matched = medidasCatalogo.find((item) => normalize(item.label) === current);
                const value = matched?.code ?? "__custom__";

                return (
                  <Select
                    value={value}
                    onChange={(event) => {
                      const code = event.target.value;
                      if (code === "__custom__") {
                        return;
                      }
                      const selected = medidasCatalogo.find((item) => item.code === code);
                      if (selected) {
                        form.setValue("medidaCautelar.descripcion", selected.label, { shouldDirty: true });
                      }
                    }}
                    disabled={!editable || medidasCatalogo.length === 0}
                  >
                    <option value="__custom__">
                      {medidasCatalogo.length === 0 ? "Cargando catalogo..." : "Personalizada (no cambiar)"}
                    </option>
                    {medidasCatalogo.map((item) => (
                      <option key={item.id} value={item.code}>
                        {item.label}
                      </option>
                    ))}
                  </Select>
                );
              })()}
              <p className="mt-1 text-xs text-muted-foreground">
                Selecciona una medida y, si aplica, ajusta la descripcion.
              </p>
            </Field>
            <Field label="Descripcion (editable)">
              <Textarea rows={3} {...form.register("medidaCautelar.descripcion")} disabled={!editable} />
            </Field>
            <Field label="Tipo">
              <Input {...form.register("medidaCautelar.tipo")} disabled={!editable} />
            </Field>
            <Field label="Fundamento">
              <Input {...form.register("medidaCautelar.fundamento")} disabled={!editable} />
            </Field>
          </div>
        </Section>
      ),
    },
    {
      title: "Observaciones",
      content: (
        <Section title="Observaciones">
          <Field label="Texto">
            <Textarea rows={3} {...form.register("observaciones.texto")} disabled={!editable} />
          </Field>
          {(() => {
            const relevancia = form.watch("observaciones.relevancia");
            const violenciaGenero = form.watch("observaciones.violenciaGenero");
            const selected = violenciaGenero ? "VIOLENCIA_GENERO" : relevancia === "ALTA" ? "ALTA" : "BAJA";

            return (
              <div className="space-y-3">
                <Field label="Color (Mampara)">
                  <Select
                    value={selected}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value === "VIOLENCIA_GENERO") {
                        form.setValue("observaciones.violenciaGenero", true, { shouldDirty: true });
                        form.setValue("observaciones.relevancia", "BAJA", { shouldDirty: true });
                        return;
                      }

                      form.setValue("observaciones.violenciaGenero", false, { shouldDirty: true });
                      form.setValue("observaciones.relevancia", value === "ALTA" ? "ALTA" : "BAJA", { shouldDirty: true });
                    }}
                    disabled={!editable}
                  >
                    <option value="BAJA">RELEVANCIA BAJA (AMARILLO)</option>
                    <option value="ALTA">RELEVANCIA ALTA (ROJO)</option>
                    <option value="VIOLENCIA_GENERO">VIOLENCIA DE GENERO (MORADO)</option>
                  </Select>
                </Field>

                <div className="flex flex-wrap items-center gap-4 rounded-md border border-border bg-muted/30 p-3">
                  <ColorLegendItem
                    label="VIOLENCIA DE GENERO"
                    color="#CC99FF"
                    active={selected === "VIOLENCIA_GENERO"}
                  />
                  <ColorLegendItem label="RELEVANCIA ALTA" color="#FF0000" active={selected === "ALTA"} />
                  <ColorLegendItem label="RELEVANCIA BAJA" color="#FFFF00" active={selected === "BAJA"} />
                </div>
              </div>
            );
          })()}
        </Section>
      ),
    },
  ] as const;

  const goToStep = (nextIndex: number) => {
    const clamped = Math.min(Math.max(nextIndex, 0), stepItems.length - 1);
    setStepIndex(clamped);
    stepsTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const submitDraft = form.handleSubmit(async (values) => {
    if (!editable) {
      toast.error("Tu rol no puede editar fichas");
      return;
    }
    if (inTrash) {
      toast.error("La ficha esta en papelera. Restaurala para editarla.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...values,
        observaciones: {
          ...values.observaciones,
          relevancia: values.observaciones.relevancia || undefined,
        },
      };

      const res = await fetch(`/api/records/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload,
          currentArea: inferAreaByRole(role),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo guardar ficha");
      }

      toast.success("Ficha guardada");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setSaving(false);
    }
  });

  const requestStatus = async (toStatus: "DRAFT" | "READY" | "APPROVED" | "NEEDS_CHANGES") => {
    if (toStatus === "DRAFT") {
      return;
    }
    if (inTrash) {
      toast.error("La ficha esta en papelera. Restaurala para cambiar estatus.");
      return;
    }
    let comment = "";
    if (toStatus === "NEEDS_CHANGES") {
      const answer = prompt("Comentario obligatorio para solicitar cambios:");
      if (!answer || answer.trim().length === 0) {
        toast.error("Debes capturar un comentario");
        return;
      }
      comment = answer;
    }

    try {
      const response = await fetch(`/api/records/${record.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStatus, comment }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "No se pudo cambiar estatus");
      }

      toast.success(`Estatus actualizado a ${recordStatusLabel(toStatus)}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    }
  };

  const uploadEvidence = async (file: File | null) => {
    if (!file) {
      return;
    }
    if (inTrash) {
      toast.error("La ficha esta en papelera. Restaurala para agregar evidencias.");
      return;
    }

    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const response = await fetch(`/api/records/${record.id}/evidence`, {
        method: "POST",
        body: data,
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "No se pudo subir evidencia");
      }

      toast.success("Evidencia cargada");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setUploading(false);
    }
  };

  const deleteEvidence = async (evidenceId: string) => {
    if (inTrash) {
      toast.error("La ficha esta en papelera. Restaurala para modificar evidencias.");
      return;
    }
    if (!confirm("Deseas borrar esta evidencia?")) {
      return;
    }

    try {
      const response = await fetch(`/api/evidence/${evidenceId}`, {
        method: "DELETE",
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "No se pudo borrar evidencia");
      }
      toast.success("Evidencia eliminada");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    }
  };

  const generateArtifact = (format: "pptx" | "pdf", template?: "mampara" | "ficha") => {
    if (inTrash) {
      toast.error("La ficha esta en papelera. Restaurala para generar documentos.");
      return;
    }

    const key = format === "pptx" ? (`pptx-${template || "mampara"}` as const) : "pdf";
    setGenerating(key);

    // Descarga directa (GET) para evitar bloqueos de Safari/iOS con descargas iniciadas despues de `await`.
    // El endpoint genera + guarda artifact y responde con el archivo como attachment.
    const query = new URLSearchParams({ format });
    if (format === "pptx" && template) {
      query.set("template", template);
    }
    const downloadUrl = `/api/records/${record.id}/generate?${query.toString()}`;

    const isIOS =
      typeof navigator !== "undefined" &&
      (/iP(ad|hone|od)/.test(navigator.userAgent) ||
        // iPadOS 13+ a veces reporta "Macintosh"; esto lo detecta como iOS con touch.
        (navigator.userAgent.includes("Mac") && typeof document !== "undefined" && "ontouchend" in document));

    try {
      toast.message("Generando documento...", {
        description: "La descarga iniciara automaticamente.",
      });

      if (isIOS) {
        // iPhone/iPad: misma pestana para que Safari dispare el flujo de descargas.
        window.location.href = downloadUrl;
      } else {
        // Desktop/Android: nueva pestana (mas comodo) usando click de anchor.
        const anchor = document.createElement("a");
        anchor.href = downloadUrl;
        anchor.target = "_blank";
        anchor.rel = "noopener";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      }

      // Refresca para mostrar el artifact ya generado en la lista (puede tardar unos segundos).
      window.setTimeout(() => router.refresh(), 2000);
      window.setTimeout(() => router.refresh(), 7000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      window.setTimeout(() => setGenerating(""), 2500);
    }
  };

  const deleteRecord = async () => {
    if (!confirm("Enviar la ficha a papelera?")) {
      return;
    }

    try {
      const response = await fetch(`/api/records/${record.id}`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "No se pudo enviar a papelera");
      }

      toast.success("Ficha enviada a papelera");
      router.replace("/records");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    }
  };

  const restoreRecord = async () => {
    try {
      const response = await fetch(`/api/records/${record.id}/restore`, { method: "POST" });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "No se pudo restaurar la ficha");
      }
      toast.success("Ficha restaurada");
      router.replace("/records");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    }
  };

  const purgeRecord = async () => {
    if (!confirm("Borrar definitivamente la ficha? Esta accion no se puede deshacer.")) {
      return;
    }

    try {
      const response = await fetch(`/api/records/${record.id}/purge`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "No se pudo borrar definitivamente la ficha");
      }
      toast.success("Ficha borrada definitivamente");
      router.replace("/records");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    }
  };

  const canDeleteEvidence =
    !inTrash &&
    (role === "FLAGRANCIA" || role === "MP" || role === "ADMIN" || (role === "LITIGACION" && litigacionCanDeleteEvidence));

  // La mampara toma la foto de la evidencia imagen mas reciente.
  const mamparaPhoto = record.evidences.find((item) => item.contentType.startsWith("image/"));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="mr-2">Ficha {record.id.slice(0, 8)}</span>
            <StatusBadge status={record.status} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Caso: <Link href={`/cases/${record.case.id}`} className="font-semibold underline">{record.case.folio}</Link> · {record.case.title}
          </p>
          <p>
            Version: {record.version} · Area actual: {record.currentArea} · Module owner: {record.moduleOwner}
          </p>
          {inTrash ? (
            <div className="rounded-md border border-border bg-muted p-3 text-sm">
              Esta ficha esta en papelera{record.deletedAt ? ` desde ${new Date(record.deletedAt).toLocaleString()}` : ""}.
            </div>
          ) : null}
          <div className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] sm:flex-wrap sm:overflow-visible">
            {transitions.map((item) => (
              <Button key={item.toStatus} size="sm" className="shrink-0" onClick={() => requestStatus(item.toStatus)}>
                <Send className="h-4 w-4" /> {item.label}
              </Button>
            ))}
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              disabled={inTrash || generating !== ""}
              onClick={() => generateArtifact("pptx", "mampara")}
            >
              <FileDown className="h-4 w-4" />{" "}
              {generating === "pptx-mampara" ? "Generando..." : "Generar PPTX (Mampara)"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              disabled={inTrash || generating !== ""}
              onClick={() => generateArtifact("pptx", "ficha")}
            >
              <FileDown className="h-4 w-4" />{" "}
              {generating === "pptx-ficha" ? "Generando..." : "Generar PPTX (Ficha)"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              disabled={inTrash || generating !== ""}
              onClick={() => generateArtifact("pdf")}
            >
              <FileDown className="h-4 w-4" /> {generating === "pdf" ? "Generando..." : "Generar PDF (Ficha)"}
            </Button>
            {canDeleteRecord(role) && !inTrash ? (
              <Button size="sm" variant="destructive" className="shrink-0" onClick={deleteRecord}>
                <Trash2 className="h-4 w-4" /> Enviar a papelera
              </Button>
            ) : null}
            {canDeleteRecord(role) && inTrash ? (
              <>
                <Button size="sm" variant="outline" className="shrink-0" onClick={restoreRecord}>
                  <RotateCcw className="h-4 w-4" /> Restaurar ficha
                </Button>
                <Button size="sm" variant="destructive" className="shrink-0" onClick={purgeRecord}>
                  <Trash2 className="h-4 w-4" /> Borrar definitivo
                </Button>
              </>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plantilla unica de ficha (11 secciones)</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={submitDraft}>
            <div ref={stepsTopRef} className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm font-medium text-card-foreground">
                  Captura por pasos{" "}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    Paso {stepIndex + 1} de {stepItems.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={stepIndex === 0}
                    onClick={() => goToStep(stepIndex - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" /> Anterior
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={stepIndex === stepItems.length - 1}
                    onClick={() => goToStep(stepIndex + 1)}
                  >
                    Siguiente <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Mobile: selector de paso. Desktop: chips clicables */}
              <div className="sm:hidden">
                <Select value={String(stepIndex)} onChange={(event) => goToStep(Number(event.target.value))}>
                  {stepItems.map((step, index) => (
                    <option key={step.title} value={index}>
                      {index + 1}. {stripStepTitle(step.title)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="hidden flex-wrap gap-2 sm:flex">
                {stepItems.map((step, index) => {
                  const active = index === stepIndex;
                  return (
                    <button
                      key={step.title}
                      type="button"
                      onClick={() => goToStep(index)}
                      className={[
                        "inline-flex items-center rounded-full border px-3 py-1 text-xs",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-muted-foreground hover:text-card-foreground",
                      ].join(" ")}
                    >
                      <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-background/30 text-[11px] font-semibold">
                        {index + 1}
                      </span>
                      {stripStepTitle(step.title)}
                    </button>
                  );
                })}
              </div>
            </div>

            {stepItems[stepIndex]?.content}

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={!editable || saving || inTrash}>
                <Save className="h-4 w-4" /> {saving ? "Guardando..." : "Guardar borrador"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={stepIndex === stepItems.length - 1}
                onClick={() => goToStep(stepIndex + 1)}
              >
                Continuar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Archivos (evidencias)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Foto para Mampara:{" "}
            {mamparaPhoto ? (
              <span className="font-medium text-card-foreground">{mamparaPhoto.originalName}</span>
            ) : (
              <span className="font-medium text-card-foreground">Sin foto (sube una imagen JPG/PNG)</span>
            )}
            . Se usa la imagen mas reciente.
          </p>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              disabled={uploading || inTrash}
              onChange={(event) => uploadEvidence(event.target.files?.[0] ?? null)}
            />
            <Button type="button" variant="outline" disabled>
              <Upload className="h-4 w-4" />
            </Button>
          </div>
          {record.evidences.length === 0 ? <p className="text-sm text-muted-foreground">No hay evidencias cargadas.</p> : null}
          {record.evidences.map((evidence) => (
            <div
              key={evidence.id}
              id={`evidence-${evidence.id}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
            >
              <div>
                <p className="text-sm font-medium text-card-foreground">
                  {evidence.originalName}{" "}
                  {mamparaPhoto?.id === evidence.id ? (
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      Foto mampara
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">{Math.round(evidence.sizeBytes / 1024)} KB · {new Date(evidence.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <a href={`/api/evidence/${evidence.id}/download`} download>
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4" /> Descargar
                  </Button>
                </a>
                {canDeleteEvidence ? (
                  <Button size="sm" variant="destructive" onClick={() => deleteEvidence(evidence.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de estado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {record.statusTransitions.length === 0 ? <p className="text-sm text-muted-foreground">Sin transiciones.</p> : null}
          {record.statusTransitions.map((transition) => (
            <p key={transition.id} className="text-xs text-muted-foreground">
              {new Date(transition.createdAt).toLocaleString()} · {transition.changedByUser.name} ·{" "}
              {recordStatusLabel(transition.fromStatus)} -&gt; {recordStatusLabel(transition.toStatus)}
              {transition.comment ? ` (${transition.comment})` : ""}
            </p>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Artefactos generados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {record.artifacts.length === 0 ? <p className="text-sm text-muted-foreground">Aun no se han generado documentos.</p> : null}
          {record.artifacts.map((artifact) => (
            <div
              key={artifact.id}
              id={`artifact-${artifact.id}`}
              className="flex items-center justify-between rounded-md border border-border p-3"
            >
              <div>
                <p className="text-sm font-medium text-card-foreground">{artifact.format} · {artifact.fileName}</p>
                <p className="text-xs text-muted-foreground">{new Date(artifact.createdAt).toLocaleString()}</p>
              </div>
              <a href={`/api/artifacts/${artifact.id}/download`} download>
                <Button size="sm" variant="outline">
                  <Download className="h-4 w-4" /> Descargar
                </Button>
              </a>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ColorLegendItem({ label, color, active }: { label: string; color: string; active: boolean }) {
  return (
    <div
      className={[
        "flex items-center gap-2 rounded-md px-2 py-1",
        active ? "bg-background/60 ring-1 ring-primary" : "opacity-80",
      ].join(" ")}
    >
      <span
        className="h-4 w-4 shrink-0 rounded-sm border border-foreground/20"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="text-xs font-semibold text-foreground">{label}</span>
    </div>
  );
}

function stripStepTitle(title: string) {
  return title.replace(/^\d+\)\s*/, "");
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}
