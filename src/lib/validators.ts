import { CurrentArea, ModuleOwner, RecordStatus, Role } from "@prisma/client";
import { z } from "zod";

const text = (max: number) => z.string().max(max);
const optionalText = (max: number) => z.string().max(max).default("");

const relevanciaSchema = z.enum(["ALTA", "MEDIA", "BAJA"]);

export const fichaPayloadSchema = z
  .object({
    agencyName: optionalText(200).default("FISCALIA DE INVESTIGACION METROPOLITANA"),
    reportTitle: optionalText(240).default(
      "REPORTE DE PARTICIPACION MINISTERIAL EN AUDIENCIA JUDICIAL",
    ),
    templateVersion: optionalText(20).default("v1"),
    expedientes: z
      .object({
        cdi: optionalText(140),
        cp: optionalText(140),
        carpetaJudicial: optionalText(140),
        juicioOral: optionalText(140),
      })
      .default({ cdi: "", cp: "", carpetaJudicial: "", juicioOral: "" }),
    fechaHora: z
      .object({
        fecha: optionalText(120),
        horaProgramada: optionalText(120),
        horaInicio: optionalText(120),
        horaTermino: optionalText(120),
      })
      .default({ fecha: "", horaProgramada: "", horaInicio: "", horaTermino: "" }),
    delito: z.object({ nombre: optionalText(200) }).default({ nombre: "" }),
    imputado: z.object({ nombreCompleto: optionalText(200) }).default({ nombreCompleto: "" }),
    ofendido: z.object({ nombreCompleto: optionalText(200) }).default({ nombreCompleto: "" }),
    hecho: z.object({ descripcion: optionalText(6000) }).default({ descripcion: "" }),
    audiencia: z
      .object({
        tipo: optionalText(200),
        etapa: optionalText(200),
        modalidad: optionalText(100),
      })
      .default({ tipo: "", etapa: "", modalidad: "" }),
    autoridades: z
      .object({
        juez: optionalText(180),
        mp: optionalText(180),
        defensa: optionalText(180),
        asesorJuridico: optionalText(180),
        observacion: optionalText(1000),
      })
      .default({ juez: "", mp: "", defensa: "", asesorJuridico: "", observacion: "" }),
    resultado: z.object({ descripcion: optionalText(3000) }).default({ descripcion: "" }),
    medidaCautelar: z
      .object({
        descripcion: optionalText(2000),
        tipo: optionalText(200),
        fundamento: optionalText(1000),
      })
      .default({ descripcion: "", tipo: "", fundamento: "" }),
    observaciones: z
      .object({
        texto: optionalText(3000),
        relevancia: relevanciaSchema.optional(),
        violenciaGenero: z.boolean().optional(),
      })
      .default({ texto: "", relevancia: undefined, violenciaGenero: false }),
  })
  .strict();

export type FichaPayload = z.infer<typeof fichaPayloadSchema>;

export const emptyFichaPayload: FichaPayload = fichaPayloadSchema.parse({});

export const loginSchema = z
  .object({
    email: z.string().email(),
    password: text(128),
  })
  .strict();

export const caseCreateSchema = z
  .object({
    folio: text(80),
    title: text(240),
    description: optionalText(2000).default(""),
  })
  .strict();

export const casePatchSchema = z
  .object({
    folio: text(80).optional(),
    title: text(240).optional(),
    description: text(2000).optional(),
  })
  .strict();

export const recordCreateSchema = z
  .object({
    payload: fichaPayloadSchema.default(emptyFichaPayload),
    moduleOwner: z.nativeEnum(ModuleOwner),
  })
  .strict();

export const recordPatchSchema = z
  .object({
    payload: fichaPayloadSchema,
    currentArea: z.nativeEnum(CurrentArea).optional(),
  })
  .strict();

export const statusChangeSchema = z
  .object({
    toStatus: z.nativeEnum(RecordStatus),
    comment: optionalText(1000).default(""),
  })
  .strict();

export const roleSchema = z.nativeEnum(Role);

export const userCreateSchema = z
  .object({
    name: text(160),
    email: z.string().email(),
    password: text(128),
    role: roleSchema,
    isActive: z.boolean().optional().default(true),
  })
  .strict();

export const userPatchSchema = z
  .object({
    name: text(160).optional(),
    email: z.string().email().optional(),
    password: text(128).optional(),
    role: roleSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const catalogCreateSchema = z
  .object({
    category: text(120),
    code: text(120),
    label: text(200),
    isActive: z.boolean().optional().default(true),
  })
  .strict();

export const catalogPatchSchema = z
  .object({
    category: text(120).optional(),
    code: text(120).optional(),
    label: text(200).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

const HOUR_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(\s?(HRS|hrs|HORAS|horas))?$/;

export function validateReadyPayload(payload: FichaPayload) {
  const errors: string[] = [];
  const required = [
    [payload.expedientes.cdi, "expedientes.cdi"],
    [payload.expedientes.cp, "expedientes.cp"],
    [payload.fechaHora.fecha, "fechaHora.fecha"],
    [payload.fechaHora.horaProgramada, "fechaHora.horaProgramada"],
    [payload.delito.nombre, "delito.nombre"],
    [payload.imputado.nombreCompleto, "imputado.nombreCompleto"],
    [payload.ofendido.nombreCompleto, "ofendido.nombreCompleto"],
    [payload.audiencia.tipo, "audiencia.tipo"],
    [payload.autoridades.juez, "autoridades.juez"],
    [payload.autoridades.mp, "autoridades.mp"],
    [payload.resultado.descripcion, "resultado.descripcion"],
    [payload.medidaCautelar.descripcion, "medidaCautelar.descripcion"],
  ];

  for (const [value, label] of required) {
    if (!value || value.trim().length === 0) {
      errors.push(`${label} es obligatorio para estado LISTO`);
    }
  }

  if (!payload.hecho.descripcion || payload.hecho.descripcion.trim().length < 20) {
    errors.push("hecho.descripcion debe contener al menos 20 caracteres para LISTO");
  }

  if (payload.fechaHora.horaInicio && !HOUR_REGEX.test(payload.fechaHora.horaInicio)) {
    errors.push("fechaHora.horaInicio debe tener formato de hora valido (HH:MM)");
  }

  if (payload.fechaHora.horaTermino && !HOUR_REGEX.test(payload.fechaHora.horaTermino)) {
    errors.push("fechaHora.horaTermino debe tener formato de hora valido (HH:MM)");
  }

  return errors;
}
