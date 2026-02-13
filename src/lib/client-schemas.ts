import { z } from "zod";

const optionalText = (max: number) => z.string().max(max);

export const caseFormSchema = z.object({
  folio: z.string().min(1).max(80),
  title: z.string().min(1).max(240),
  description: z.string().max(2000),
});

export const recordFormSchema = z.object({
  agencyName: optionalText(200),
  reportTitle: optionalText(240),
  templateVersion: optionalText(20),
  expedientes: z.object({
    cdi: optionalText(140),
    cp: optionalText(140),
    carpetaJudicial: optionalText(140),
    juicioOral: optionalText(140),
  }),
  fechaHora: z.object({
    fecha: optionalText(120),
    horaProgramada: optionalText(120),
    horaInicio: optionalText(120),
    horaTermino: optionalText(120),
  }),
  delito: z.object({
    nombre: optionalText(200),
  }),
  imputado: z.object({
    nombreCompleto: optionalText(200),
  }),
  ofendido: z.object({
    nombreCompleto: optionalText(200),
  }),
  hecho: z.object({
    descripcion: optionalText(6000),
  }),
  audiencia: z.object({
    tipo: optionalText(200),
    etapa: optionalText(200),
    modalidad: optionalText(100),
  }),
  autoridades: z.object({
    juez: optionalText(180),
    mp: optionalText(180),
    defensa: optionalText(180),
    asesorJuridico: optionalText(180),
    observacion: optionalText(1000),
  }),
  resultado: z.object({
    descripcion: optionalText(3000),
  }),
  medidaCautelar: z.object({
    descripcion: optionalText(2000),
    tipo: optionalText(200),
    fundamento: optionalText(1000),
  }),
  observaciones: z.object({
    texto: optionalText(3000),
    relevancia: z.enum(["ALTA", "MEDIA", "BAJA", ""]),
    violenciaGenero: z.boolean(),
  }),
});

export type RecordFormInput = z.infer<typeof recordFormSchema>;

export const emptyRecordForm: RecordFormInput = {
  agencyName: "FISCALIA DE INVESTIGACION METROPOLITANA",
  reportTitle: "REPORTE DE PARTICIPACION MINISTERIAL EN AUDIENCIA JUDICIAL",
  templateVersion: "v1",
  expedientes: { cdi: "", cp: "", carpetaJudicial: "", juicioOral: "" },
  fechaHora: { fecha: "", horaProgramada: "", horaInicio: "", horaTermino: "" },
  delito: { nombre: "" },
  imputado: { nombreCompleto: "" },
  ofendido: { nombreCompleto: "" },
  hecho: { descripcion: "" },
  audiencia: { tipo: "", etapa: "", modalidad: "" },
  autoridades: { juez: "", mp: "", defensa: "", asesorJuridico: "", observacion: "" },
  resultado: { descripcion: "" },
  medidaCautelar: { descripcion: "", tipo: "", fundamento: "" },
  observaciones: { texto: "", relevancia: "", violenciaGenero: false },
};
