import path from "node:path";

import PptxGenJS from "pptxgenjs";

import type { FichaPayload } from "@/lib/validators";
import { fitTextToBox } from "@/server/docgen/text-fit";

export type TarjetaPptxOptions = {
  photoPath?: string | null;
};

// Layout basado en el PPTX de referencia:
// `/Users/a1111/Desktop/SIGEA/9925 ROBO DE VEHICULO AGRAVADO FEBRERO 2026.pptx`
const POS = {
  headerBar: { x: 0.005928, y: -0.026272, w: 13.333333, h: 1.351851 },
  relevancia: { x: 11.431904, y: -0.035531, w: 1.042466, h: 1.351851 },
  delito: { x: 0.10185, y: 0.094255, w: 4.728875, h: 0.905745 },
  subtitulo: { x: 7.281251, y: 0.458161, w: 3.549578, h: 0.382986 },
  stripes: { x: 0.817425, y: 1.5074, w: 1.704511, h: 2.144113 },
  lugarBox: { x: 1.034298, y: 1.69507, w: 3.796427, h: 1.204444 },
  photo: { x: 2.088379, y: 3.031231, w: 1.684347, h: 1.68089 },
  acusadoBox: { x: 0.968731, y: 4.838191, w: 3.415761, h: 0.30293 },
  identificacion: { x: 5.20395, y: 1.499102, w: 3.939035, h: 0.627615 },
  barAzul: { x: 5.590005, y: 2.126717, w: 3.139331, h: 0.128904 },
  etapaBox: { x: 5.20395, y: 2.413758, w: 3.143885, h: 0.277686 },
  hechos: { x: 5.279049, y: 2.356701, w: 4.002506, h: 3.736132 },
  resultadoHeader: { x: 10.028697, y: 1.384121, w: 2.078718, h: 0.504883 },
  resultado: { x: 9.356652, y: 1.878799, w: 3.66279, h: 3.53418 },
  footerLogo: { x: 0.0, y: 6.564815, w: 2.185185, h: 0.84093 },
  footerSlogan: { x: 11.460248, y: 6.879629, w: 1.77108, h: 0.479233 },
} as const;

const COLORS = {
  beige: "DAC59A",
  darkBlue: "294A78",
  white: "FFFFFF",
  black: "000000",
  labelGrey: "BDBABA",
  labelBorder: "D3A77B",
  red: "FF0000",
  redDark: "C00000",
  yellow: "FFFF00",
  purple: "CC99FF",
} as const;

function assetsPath(fileName: string) {
  // Reutiliza los mismos assets (son los mismos del PPTX de referencia).
  return path.join(process.cwd(), "assets", "mampara", fileName);
}

function safe(value: string) {
  return (value || "").toString().replace(/\s+/g, " ").trim();
}

function buildCdiLine(payload: FichaPayload) {
  const raw = safe(payload.expedientes.cdi);
  if (!raw) return "CDI";
  const upper = raw.toUpperCase();
  return upper.startsWith("CDI") ? raw : `CDI ${raw}`;
}

function buildCpLine(payload: FichaPayload) {
  const raw = safe(payload.expedientes.cp);
  if (!raw) return "C.P.";
  const upper = raw.toUpperCase();
  if (upper.startsWith("C.P") || upper.startsWith("CP")) return raw;
  return `C.P. ${raw}`;
}

function buildEtapaLine(payload: FichaPayload) {
  const etapa = safe(payload.audiencia.etapa) || safe(payload.audiencia.tipo);
  if (!etapa) return "ETAPA:";
  const upper = etapa.toUpperCase();
  return upper.startsWith("ETAPA:") ? etapa : `ETAPA: ${etapa}`;
}

function buildLugarHechos(payload: FichaPayload) {
  const base = safe(payload.hecho.descripcion);
  const clipped = base.length > 190 ? `${base.slice(0, 189).trimEnd()}...` : base;
  const upper = clipped.toUpperCase();
  if (upper.startsWith("LUGAR HECHOS:") || upper.startsWith("LUGAR DEL HECHO:")) {
    return clipped;
  }
  return `Lugar hechos: ${clipped || "SIN DATOS"}`;
}

function buildAcusado(payload: FichaPayload) {
  const name = safe(payload.imputado.nombreCompleto);
  if (!name) return "Acusado:";
  const upper = name.toUpperCase();
  return upper.startsWith("ACUSADO:") ? name : `Acusado: ${name}`;
}

function buildHechos(payload: FichaPayload) {
  const base = safe(payload.hecho.descripcion);
  return `HECHOS\n\n${base || "SIN DATOS"}`;
}

function buildResultado(payload: FichaPayload) {
  const parts = [safe(payload.resultado.descripcion)];

  const medida = safe(payload.medidaCautelar.descripcion);
  if (medida) {
    parts.push(`Medida cautelar: ${medida}`);
  }

  const obs = safe(payload.observaciones.texto);
  if (obs) {
    parts.push(`Observaciones: ${obs}`);
  }

  return parts.filter((item) => item.length > 0).join("\n\n");
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
  if (payload.observaciones.violenciaGenero) {
    return COLORS.purple;
  }
  return relevanciaToColor(payload.observaciones.relevancia);
}

export async function generateTarjetaPptx(payload: FichaPayload, options: TarjetaPptxOptions = {}) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "SIGEA";
  pptx.company = "SIGEA";
  pptx.subject = "Tarjeta informativa";

  const slide = pptx.addSlide();

  slide.addImage({ path: assetsPath("header-bar.png"), ...POS.headerBar });

  const indicadorColor = indicadorToColor(payload);
  slide.addShape(pptx.ShapeType.rect, {
    ...POS.relevancia,
    fill: { color: indicadorColor },
    line: { color: indicadorColor, pt: 0 },
  });

  const delitoText = `Delito: ${safe(payload.delito.nombre) || "SIN DATO"}`;
  const delitoFitted = fitTextToBox({
    text: delitoText,
    w: POS.delito.w,
    h: POS.delito.h,
    baseFontSize: 16,
    minFontSize: 12,
    lineHeightMultiple: 1.0,
    charWidthRatio: 0.62,
    maxLines: 2,
  });
  slide.addText(delitoFitted.text, {
    ...POS.delito,
    fontFace: "Montserrat",
    fontSize: delitoFitted.fontSize,
    color: COLORS.white,
    align: "center",
    valign: "bottom",
    breakLine: true,
    margin: [3.6, 7.2, 3.6, 7.2],
  });

  slide.addText("COORDINACIÓN DE\nLITIGACIÓN", {
    ...POS.subtitulo,
    fontFace: "Montserrat",
    fontSize: 20,
    color: COLORS.white,
    align: "center",
    valign: "middle",
    breakLine: true,
    margin: [3.6, 7.2, 3.6, 7.2],
  });

  slide.addImage({ path: assetsPath("left-stripes.png"), ...POS.stripes });

  slide.addShape(pptx.ShapeType.rect, {
    ...POS.lugarBox,
    fill: { color: COLORS.beige },
    line: { color: COLORS.beige, pt: 1 },
  });
  const lugarFitted = fitTextToBox({
    text: buildLugarHechos(payload),
    w: Math.max(POS.lugarBox.w - 0.2, 0.2),
    h: Math.max(POS.lugarBox.h - 0.16, 0.2),
    baseFontSize: 12,
    minFontSize: 9,
    lineHeightMultiple: 1.12,
    charWidthRatio: 0.55,
  });
  slide.addText(lugarFitted.text, {
    x: POS.lugarBox.x + 0.1,
    y: POS.lugarBox.y + 0.08,
    w: POS.lugarBox.w - 0.2,
    h: POS.lugarBox.h - 0.16,
    fontFace: "Garamond",
    fontSize: lugarFitted.fontSize,
    bold: true,
    color: COLORS.black,
    align: "justify",
    valign: "top",
    breakLine: true,
    margin: [0, 0, 0, 0],
  });

  if (options.photoPath) {
    slide.addImage({
      path: options.photoPath,
      ...POS.photo,
      sizing: { type: "cover", w: POS.photo.w, h: POS.photo.h },
    });
  } else {
    slide.addShape(pptx.ShapeType.rect, {
      ...POS.photo,
      fill: { color: "F2F2F2" },
      line: { color: COLORS.labelBorder, pt: 1 },
    });
  }

  slide.addShape(pptx.ShapeType.rect, {
    ...POS.acusadoBox,
    fill: { color: COLORS.labelGrey },
    line: { color: COLORS.labelBorder, pt: 1 },
  });
  const acusadoFitted = fitTextToBox({
    text: buildAcusado(payload),
    w: Math.max(POS.acusadoBox.w - 0.1, 0.2),
    h: Math.max(POS.acusadoBox.h - 0.05, 0.2),
    baseFontSize: 12,
    minFontSize: 8,
    lineHeightMultiple: 1.0,
    charWidthRatio: 0.55,
    maxLines: 1,
  });
  slide.addText(acusadoFitted.text, {
    ...POS.acusadoBox,
    fontFace: "Garamond",
    fontSize: acusadoFitted.fontSize,
    bold: true,
    color: COLORS.black,
    align: "center",
    valign: "middle",
    margin: [0, 0, 0, 0],
  });

  // Identificación (3 líneas: DATOS / CDI / C.P. (rojo))
  const cdiLine = buildCdiLine(payload);
  const cpLine = buildCpLine(payload);
  const datosFitted = fitTextToBox({
    text: "DATOS DE IDENTIFICACIÓN",
    w: POS.identificacion.w,
    h: 0.21,
    baseFontSize: 12,
    minFontSize: 10,
    lineHeightMultiple: 1.0,
    charWidthRatio: 0.62,
    maxLines: 1,
  });
  const cdiFitted = fitTextToBox({
    text: cdiLine,
    w: POS.identificacion.w,
    h: 0.21,
    baseFontSize: 11,
    minFontSize: 9,
    lineHeightMultiple: 1.0,
    charWidthRatio: 0.62,
    maxLines: 1,
  });
  const cpFitted = fitTextToBox({
    text: cpLine,
    w: POS.identificacion.w,
    h: 0.21,
    baseFontSize: 12,
    minFontSize: 9,
    lineHeightMultiple: 1.0,
    charWidthRatio: 0.62,
    maxLines: 1,
  });
  slide.addText(
    [
      {
        text: datosFitted.text,
        options: {
          bold: true,
          fontFace: "Garamond",
          fontSize: datosFitted.fontSize,
          color: COLORS.black,
          breakLine: true,
        },
      },
      {
        text: cdiFitted.text,
        options: {
          bold: true,
          fontFace: "Garamond",
          fontSize: cdiFitted.fontSize,
          color: COLORS.black,
          breakLine: true,
        },
      },
      {
        text: cpFitted.text,
        options: {
          bold: true,
          fontFace: "Garamond",
          fontSize: cpFitted.fontSize,
          color: COLORS.redDark,
        },
      },
    ],
    {
      ...POS.identificacion,
      align: "center",
      valign: "top",
      margin: [0, 0, 0, 0],
    },
  );

  slide.addShape(pptx.ShapeType.rect, {
    ...POS.barAzul,
    fill: { color: COLORS.darkBlue },
    line: { color: COLORS.beige, pt: 1 },
  });

  slide.addShape(pptx.ShapeType.rect, {
    ...POS.etapaBox,
    fill: { color: COLORS.white },
    line: { color: COLORS.black, pt: 1 },
  });

  const etapaText = buildEtapaLine(payload);
  const etapaFitted = fitTextToBox({
    text: etapaText,
    w: Math.max(POS.etapaBox.w - 0.1, 0.2),
    h: Math.max(POS.etapaBox.h - 0.05, 0.2),
    baseFontSize: 12,
    minFontSize: 9,
    lineHeightMultiple: 1.0,
    charWidthRatio: 0.56,
    maxLines: 1,
  });
  slide.addText(etapaFitted.text, {
    ...POS.etapaBox,
    fontFace: "Garamond",
    fontSize: etapaFitted.fontSize,
    bold: true,
    color: COLORS.redDark,
    align: "center",
    valign: "middle",
    margin: [0, 0, 0, 0],
  });

  const hechosFitted = fitTextToBox({
    text: buildHechos(payload),
    w: POS.hechos.w,
    h: POS.hechos.h,
    baseFontSize: 12,
    minFontSize: 9,
    lineHeightMultiple: 1.12,
    charWidthRatio: 0.55,
  });
  slide.addText(hechosFitted.text, {
    ...POS.hechos,
    fontFace: "Garamond",
    fontSize: hechosFitted.fontSize,
    bold: true,
    color: COLORS.black,
    align: "justify",
    valign: "top",
    breakLine: true,
    margin: [0, 0, 0, 0],
  });

  slide.addShape(pptx.ShapeType.rect, {
    ...POS.resultadoHeader,
    fill: { color: COLORS.darkBlue },
    line: { color: COLORS.darkBlue, pt: 0 },
  });
  slide.addText("Resultado de la\nInvestigación.", {
    ...POS.resultadoHeader,
    fontFace: "Garamond",
    fontSize: 12,
    bold: true,
    color: COLORS.white,
    align: "center",
    valign: "middle",
    breakLine: true,
    margin: [0, 0, 0, 0],
  });

  const resultadoFitted = fitTextToBox({
    text: buildResultado(payload),
    w: POS.resultado.w,
    h: POS.resultado.h,
    baseFontSize: 12,
    minFontSize: 9,
    lineHeightMultiple: 1.12,
    charWidthRatio: 0.55,
  });
  slide.addText(resultadoFitted.text, {
    ...POS.resultado,
    fontFace: "Garamond",
    fontSize: resultadoFitted.fontSize,
    bold: true,
    color: COLORS.black,
    align: "justify",
    valign: "top",
    breakLine: true,
    margin: [0, 0, 0, 0],
  });

  slide.addImage({ path: assetsPath("logo-fge-puebla.png"), ...POS.footerLogo });
  slide.addImage({ path: assetsPath("slogan.png"), ...POS.footerSlogan });

  return (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
}
