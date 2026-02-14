import fs from "node:fs/promises";
import path from "node:path";

import JSZip from "jszip";

import type { FichaPayload } from "@/lib/validators";

const DEFAULT_AGENCY_NAME = "FISCALIA DE INVESTIGACIÓN METROPOLITANA";
const DEFAULT_REPORT_TITLE = "REPORTE DE PARTICIPACIÓN MINISTERIAL EN AUDIENCIA JUDICIAL";

function templatePath() {
  return path.join(process.cwd(), "assets", "templates", "ficha_template.pptx");
}

function safeInline(value: unknown) {
  return (value ?? "").toString().replace(/\s+/g, " ").trim();
}

function safeMultiline(value: unknown) {
  const raw = (value ?? "").toString().replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = raw.split("\n").map((line) => line.replace(/\s+/g, " ").trim());
  return lines.join("\n").trim();
}

function upperKeepBreaks(value: unknown) {
  return safeMultiline(value).toUpperCase();
}

function xmlEscape(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function replaceAll(haystack: string, needle: string, replacement: string) {
  if (!needle) return haystack;
  return haystack.split(needle).join(replacement);
}

function buildCp(payload: FichaPayload) {
  const raw = safeInline(payload.expedientes.cp);
  if (!raw) return "";
  const up = raw.toUpperCase();
  if (up.startsWith("CP")) {
    return raw;
  }
  return `CP: ${raw}`;
}

function buildHoraLines(payload: FichaPayload) {
  const programada = safeInline(payload.fechaHora.horaProgramada);
  const inicio = safeInline(payload.fechaHora.horaInicio);
  const termino = safeInline(payload.fechaHora.horaTermino);

  const line1 = programada ? upperKeepBreaks(programada) : "";

  const parts: string[] = [];
  if (inicio) {
    const up = inicio.toUpperCase();
    parts.push(up.startsWith("HORA") ? inicio : `HORA DE INICIO: ${inicio}`);
  }
  if (termino) {
    const up = termino.toUpperCase();
    parts.push(up.startsWith("HORA") ? termino : `HORA DE TERMINO: ${termino}`);
  }

  const line2 = parts.length > 0 ? upperKeepBreaks(parts.join(" ")) : "";

  return { line1, line2 };
}

function buildJuezCell(payload: FichaPayload) {
  const juez = safeInline(payload.autoridades.juez);
  const mp = safeInline(payload.autoridades.mp);
  if (juez && mp) {
    return upperKeepBreaks(`${juez} / MP: ${mp}`);
  }
  return upperKeepBreaks(juez || mp || "");
}

function buildObservacionesCell(payload: FichaPayload) {
  const modalidad = safeInline(payload.audiencia.modalidad);
  const texto = safeInline(payload.observaciones.texto);

  if (modalidad && texto) {
    return upperKeepBreaks(`${modalidad}\n${texto}`);
  }

  return upperKeepBreaks(modalidad || texto || "");
}

export async function generateFichaPptx(payload: FichaPayload) {
  const buffer = await fs.readFile(templatePath());
  const zip = await JSZip.loadAsync(buffer);

  const slidePath = "ppt/slides/slide8.xml";
  const slideXmlRaw = await zip.file(slidePath)?.async("string");
  if (!slideXmlRaw) {
    throw new Error(`No se encontro ${slidePath} en template ficha`);
  }

  const hora = buildHoraLines(payload);

  const tokens: Record<string, string> = {
    "{{AGENCY_NAME}}": upperKeepBreaks(payload.agencyName || DEFAULT_AGENCY_NAME),
    "{{REPORT_TITLE}}": upperKeepBreaks(payload.reportTitle || DEFAULT_REPORT_TITLE),
    "{{CDI}}": upperKeepBreaks(payload.expedientes.cdi),
    "{{CP}}": upperKeepBreaks(buildCp(payload)),
    "{{FECHA}}": upperKeepBreaks(payload.fechaHora.fecha),
    "{{HORA_1}}": hora.line1,
    "{{HORA_2}}": hora.line2,
    "{{DELITO}}": upperKeepBreaks(payload.delito.nombre),
    "{{IMPUTADO}}": upperKeepBreaks(payload.imputado.nombreCompleto),
    "{{OFENDIDO}}": upperKeepBreaks(payload.ofendido.nombreCompleto),
    "{{HECHO}}": upperKeepBreaks(payload.hecho.descripcion),
    "{{TIPO_AUDIENCIA}}": upperKeepBreaks(payload.audiencia.tipo),
    "{{JUEZ}}": buildJuezCell(payload),
    "{{RESULTADO}}": upperKeepBreaks(payload.resultado.descripcion),
    "{{MEDIDA_CAUTELAR}}": upperKeepBreaks(payload.medidaCautelar.descripcion),
    "{{OBSERVACIONES}}": buildObservacionesCell(payload),
  };

  let slideXml = slideXmlRaw;
  for (const [token, value] of Object.entries(tokens)) {
    slideXml = replaceAll(slideXml, token, xmlEscape(value));
  }

  zip.file(slidePath, slideXml);

  return zip.generateAsync({ type: "nodebuffer" });
}
