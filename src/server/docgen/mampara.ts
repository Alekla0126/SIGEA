import path from "node:path";

import PptxGenJS from "pptxgenjs";

import type { FichaPayload } from "@/lib/validators";
import { fitTextToBox } from "@/server/docgen/text-fit";

export type MamparaPptxOptions = {
  photoPath?: string | null;
};

const COLORS = {
  navy: "384467",
  darkBlue: "294A78",
  beige: "DAC59A",
  grey: "CBCBCB",
  labelGrey: "BDBABA",
  labelBorder: "D3A77B",
  white: "FFFFFF",
  black: "000000",
  red: "FF0000",
  yellow: "FFFF00",
  purple: "CC99FF",
} as const;

function assetsPath(fileName: string) {
  return path.join(process.cwd(), "assets", "mampara", fileName);
}

function toUpperSafe(value: string) {
  return (value || "").toString().trim().toUpperCase();
}

function buildHeaderTitle(payload: FichaPayload) {
  const delito = toUpperSafe(payload.delito.nombre);
  // Mantiene el look del ejemplo: 1a linea variable + texto fijo del area.
  return `${delito || "ASUNTO"}\nCOORDINACIÓN DE LITIGACIÓN\nDE LA FIM`;
}

function buildIdentificacion(payload: FichaPayload) {
  const cdi = payload.expedientes.cdi?.trim();
  const cp = payload.expedientes.cp?.trim();
  const carpeta = payload.expedientes.carpetaJudicial?.trim();

  const lines = [
    "DATOS DE IDENTIFICACIÓN",
    cdi || "",
    cp || "",
    `CARPETA JUDICIAL ${carpeta || "PUEBLA"}`.trim(),
    "",
  ].filter((line) => line.length > 0 || line === "");

  return lines.join("\n");
}

function buildLugarDelHecho(payload: FichaPayload) {
  // No existe campo dedicado en el payload canonico; se muestra un resumen.
  const base = payload.hecho.descripcion?.trim() || "";
  const compact = base.replace(/\s+/g, " ").trim();
  const clipped = compact.length > 160 ? `${compact.slice(0, 159).trimEnd()}...` : compact;
  return `Lugar del hecho: ${clipped || "SIN DATOS"}`;
}

function relevanciaToColor(relevancia?: string | null) {
  switch ((relevancia || "").toUpperCase()) {
    case "ALTA":
      return COLORS.red;
    case "BAJA":
    default:
      return COLORS.yellow;
  }
}

function indicadorToColor(payload: FichaPayload) {
  // En el formato de mampara, el color del indicador depende SOLO de:
  // - Violencia de genero (morado) o
  // - Relevancia (alta=rojo, baja=amarillo)
  if (payload.observaciones.violenciaGenero) {
    return COLORS.purple;
  }
  return relevanciaToColor(payload.observaciones.relevancia);
}

function buildAvances(payload: FichaPayload) {
  const lines = [
    payload.resultado.descripcion?.trim(),
    payload.medidaCautelar.descripcion?.trim(),
    payload.observaciones.texto?.trim(),
  ].filter((line) => Boolean(line && line.length > 0));

  return lines.join("\n\n");
}

export async function generateMamparaPptx(payload: FichaPayload, options: MamparaPptxOptions = {}) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "SIGEA";
  pptx.company = "SIGEA";
  pptx.subject = "Mampara";

  const slide = pptx.addSlide();

  // Header bar (exact position from referencia)
  slide.addImage({
    path: assetsPath("header-bar.png"),
    x: 0.0,
    y: 0.135,
    w: 13.333,
    h: 1.352,
  });

  // Indicador superior derecho (relevancia)
  slide.addShape(pptx.ShapeType.rect, {
    x: 11.432,
    y: 0.245,
    w: 0.974,
    h: 1.071,
    fill: { color: indicadorToColor(payload) },
    line: { color: COLORS.black, pt: 1.25 },
  });

  // Titulo principal
  const titleAdjusted = fitTextToBox({
    text: buildHeaderTitle(payload),
    w: 7.99,
    h: 1.017,
    baseFontSize: 32,
    minFontSize: 22,
    lineHeightMultiple: 1.05,
    charWidthRatio: 0.6,
  });

  slide.addText(titleAdjusted.text, {
    x: 0.108,
    y: 0.395,
    w: 7.99,
    h: 1.017,
    fontFace: "Montserrat",
    fontSize: titleAdjusted.fontSize,
    bold: true,
    color: COLORS.white,
    align: "left",
    valign: "bottom",
    breakLine: true,
  });

  // Bloque "FIM PUEBLA"
  slide.addText("FIM\nPUEBLA", {
    x: 9.267,
    y: 0.458,
    w: 1.564,
    h: 0.747,
    fontFace: "Montserrat",
    fontSize: 20,
    color: COLORS.white,
    align: "center",
    valign: "middle",
    breakLine: true,
  });

  // Panel izquierdo (fondo)
  slide.addImage({
    path: assetsPath("left-stripes.png"),
    x: 0.817,
    y: 1.507,
    w: 4.199,
    h: 5.281,
  });

  // Lugar del hecho (caja beige)
  slide.addShape(pptx.ShapeType.rect, {
    x: 1.227,
    y: 1.695,
    w: 3.404,
    h: 0.779,
    fill: { color: COLORS.beige },
    line: { color: COLORS.beige, pt: 1 },
  });

  const lugarAdjusted = fitTextToBox({
    text: buildLugarDelHecho(payload),
    w: 3.32,
    h: 0.73,
    baseFontSize: 10.5,
    minFontSize: 8,
    lineHeightMultiple: 1.1,
    charWidthRatio: 0.58,
  });
  slide.addText(lugarAdjusted.text, {
    x: 1.27,
    y: 1.72,
    w: 3.32,
    h: 0.73,
    fontFace: "Century Gothic",
    fontSize: lugarAdjusted.fontSize,
    bold: true,
    color: COLORS.black,
    align: "left",
    valign: "middle",
    breakLine: true,
  });

  // Foto (evidencia) o placeholder
  if (options.photoPath) {
    slide.addImage({
      path: options.photoPath,
      x: 1.99,
      y: 2.561,
      w: 1.933,
      h: 3.315,
      sizing: { type: "cover", w: 1.933, h: 3.315 },
    });
  } else {
    slide.addShape(pptx.ShapeType.rect, {
      x: 1.99,
      y: 2.561,
      w: 1.933,
      h: 3.315,
      fill: { color: "F2F2F2" },
      line: { color: COLORS.labelBorder, pt: 1 },
    });
    slide.addText("FOTO", {
      x: 1.99,
      y: 4.05,
      w: 1.933,
      h: 0.3,
      fontFace: "Arial",
      fontSize: 14,
      bold: true,
      color: "7A7A7A",
      align: "center",
      valign: "middle",
    });
  }

  // Nombre imputado (debajo de foto)
  const imputadoAdjusted = fitTextToBox({
    text: toUpperSafe(payload.imputado.nombreCompleto),
    w: 2.26,
    h: 0.404,
    baseFontSize: 9,
    minFontSize: 6.5,
    lineHeightMultiple: 1.0,
    charWidthRatio: 0.6,
    maxLines: 2,
  });

  slide.addText(imputadoAdjusted.text, {
    x: 1.787,
    y: 5.762,
    w: 2.26,
    h: 0.404,
    fontFace: "Arial",
    fontSize: imputadoAdjusted.fontSize,
    color: COLORS.black,
    align: "center",
    valign: "middle",
    breakLine: true,
  });

  // Etiqueta (Imputada)
  slide.addShape(pptx.ShapeType.rect, {
    x: 1.881,
    y: 5.893,
    w: 2.26,
    h: 0.505,
    fill: { color: COLORS.labelGrey },
    line: { color: COLORS.labelBorder, pt: 1 },
  });
  slide.addText("(Imputada)", {
    x: 1.881,
    y: 5.93,
    w: 2.26,
    h: 0.43,
    fontFace: "Montserrat",
    fontSize: 12,
    color: COLORS.black,
    align: "center",
    valign: "middle",
  });

  // Identificacion (centro superior)
  const identificacionAdjusted = fitTextToBox({
    text: buildIdentificacion(payload),
    w: 3.907,
    h: 1.111,
    baseFontSize: 12,
    minFontSize: 8.5,
    lineHeightMultiple: 1.05,
    charWidthRatio: 0.6,
  });

  slide.addText(identificacionAdjusted.text, {
    x: 5.204,
    y: 1.499,
    w: 3.907,
    h: 1.111,
    fontFace: "Montserrat",
    fontSize: identificacionAdjusted.fontSize,
    bold: true,
    color: COLORS.black,
    align: "center",
    valign: "top",
    breakLine: true,
  });

  // Barra azul bajo "CARPETA JUDICIAL ..."
  slide.addShape(pptx.ShapeType.rect, {
    x: 5.559,
    y: 2.17,
    w: 3.144,
    h: 0.136,
    fill: { color: COLORS.darkBlue },
    line: { color: COLORS.beige, pt: 1 },
  });

  // HECHOS (titulo + cuerpo)
  slide.addText("HECHOS", {
    x: 5.425,
    y: 2.307,
    w: 3.593,
    h: 0.18,
    fontFace: "Montserrat",
    fontSize: 9,
    bold: true,
    color: COLORS.black,
    align: "left",
    valign: "top",
  });

  const hechosBodyAdjusted = fitTextToBox({
    text: payload.hecho.descripcion || "",
    w: 3.593,
    h: 5.247,
    baseFontSize: 9,
    minFontSize: 7,
    lineHeightMultiple: 1.15,
    charWidthRatio: 0.58,
  });
  slide.addText(hechosBodyAdjusted.text || "", {
    x: 5.425,
    y: 2.47,
    w: 3.593,
    h: 5.247,
    fontFace: "Montserrat",
    fontSize: hechosBodyAdjusted.fontSize,
    color: COLORS.black,
    align: "justify",
    valign: "top",
    breakLine: true,
  });

  // Fondo patron columna derecha
  slide.addImage({
    path: assetsPath("pattern.png"),
    x: 9.111,
    y: 2.119,
    w: 3.637,
    h: 4.669,
  });

  // Header "Avances de investigación"
  slide.addShape(pptx.ShapeType.rect, {
    x: 10.101,
    y: 1.662,
    w: 2.082,
    h: 0.278,
    fill: { color: COLORS.darkBlue },
    line: { color: COLORS.darkBlue, pt: 0 },
  });
  slide.addText("Avances de investigación", {
    x: 10.101,
    y: 1.662,
    w: 2.082,
    h: 0.278,
    fontFace: "Century Gothic",
    fontSize: 10.5,
    bold: true,
    color: COLORS.white,
    align: "center",
    valign: "middle",
  });

  // Caja gris con avances
  slide.addShape(pptx.ShapeType.rect, {
    x: 9.163,
    y: 2.974,
    w: 3.585,
    h: 2.398,
    fill: { color: COLORS.grey },
    line: { color: COLORS.beige, pt: 1 },
  });

  const avancesAdjusted = fitTextToBox({
    text: buildAvances(payload),
    w: 3.39,
    h: 2.23,
    baseFontSize: 10.5,
    minFontSize: 8,
    lineHeightMultiple: 1.12,
    charWidthRatio: 0.6,
  });
  slide.addText(avancesAdjusted.text || "", {
    x: 9.26,
    y: 3.06,
    w: 3.39,
    h: 2.23,
    fontFace: "Montserrat",
    fontSize: avancesAdjusted.fontSize,
    bold: true,
    color: COLORS.black,
    align: "justify",
    valign: "top",
    breakLine: true,
  });

  // Footer: logo izquierda
  slide.addImage({
    path: assetsPath("logo-fge-puebla.png"),
    x: 0.0,
    y: 6.565,
    w: 2.185,
    h: 0.841,
  });

  // Leyenda: violencia de genero
  slide.addShape(pptx.ShapeType.rect, {
    x: 2.712,
    y: 6.994,
    w: 0.526,
    h: 0.343,
    fill: { color: COLORS.purple },
    line: { color: COLORS.black, pt: 1 },
  });
  slide.addText("VIOLENCIA DE GENERO", {
    x: 3.266,
    y: 7.017,
    w: 2.572,
    h: 0.286,
    fontFace: "Montserrat",
    fontSize: 11,
    bold: true,
    color: COLORS.black,
    align: "left",
    valign: "middle",
  });

  // Leyenda: relevancia alta
  slide.addShape(pptx.ShapeType.rect, {
    x: 5.576,
    y: 6.994,
    w: 0.58,
    h: 0.35,
    fill: { color: COLORS.red },
    line: { color: COLORS.black, pt: 1 },
  });
  slide.addText("RELEVANCIA ALTA", {
    x: 6.26,
    y: 7.0,
    w: 1.911,
    h: 0.337,
    fontFace: "Montserrat",
    fontSize: 11,
    bold: true,
    color: COLORS.black,
    align: "left",
    valign: "middle",
  });

  // Leyenda: relevancia baja
  slide.addShape(pptx.ShapeType.rect, {
    x: 8.097,
    y: 7.007,
    w: 0.559,
    h: 0.375,
    fill: { color: COLORS.yellow },
    line: { color: COLORS.black, pt: 1 },
  });
  slide.addText("RELEVANCIA BAJA", {
    x: 8.722,
    y: 7.0,
    w: 1.911,
    h: 0.337,
    fontFace: "Montserrat",
    fontSize: 11,
    bold: true,
    color: COLORS.black,
    align: "left",
    valign: "middle",
  });

  // Footer: slogan derecha
  slide.addImage({
    path: assetsPath("slogan.png"),
    x: 11.46,
    y: 6.88,
    w: 1.771,
    h: 0.479,
  });

  return (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
}
