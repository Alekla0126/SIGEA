import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { SourceObject } from "@react-pdf/types";

import type { FichaPayload } from "@/lib/validators";
import { fitTextToBox } from "@/server/docgen/text-fit";

const COLORS = {
  beige: "#DAC59A",
  darkBlue: "#294A78",
  white: "#FFFFFF",
  black: "#000000",
  labelGrey: "#BDBABA",
  labelBorder: "#D3A77B",
  redDark: "#C00000",
  yellow: "#FFFF00",
  red: "#FF0000",
} as const;

const POS = {
  slide: { widthIn: 13.333333, heightIn: 7.5 },
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

function pt(inches: number) {
  return inches * 72;
}

const styles = StyleSheet.create({
  page: {
    position: "relative",
    backgroundColor: COLORS.white,
    width: pt(POS.slide.widthIn),
    height: pt(POS.slide.heightIn),
  },
});

type SigeaFichaPdfProps = {
  payload: FichaPayload;
  assets: {
    headerBar: SourceObject;
    stripes: SourceObject;
    footerLogo: SourceObject;
    footerSlogan: SourceObject;
    photo?: SourceObject | null;
  };
};

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

function relevanciaToHex(relevancia?: string | null) {
  switch ((relevancia || "").toUpperCase()) {
    case "ALTA":
      return COLORS.red;
    case "MEDIA":
      return "#FFC000";
    case "BAJA":
    default:
      return COLORS.yellow;
  }
}

export function SigeaFichaPdf({ payload, assets }: SigeaFichaPdfProps) {
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

  const lugarFitted = fitTextToBox({
    text: buildLugarHechos(payload),
    w: Math.max(POS.lugarBox.w - 0.2, 0.2),
    h: Math.max(POS.lugarBox.h - 0.16, 0.2),
    baseFontSize: 12,
    minFontSize: 9,
    lineHeightMultiple: 1.12,
    charWidthRatio: 0.6, // PDF: mas conservador
  });

  const acusadoFitted = fitTextToBox({
    text: buildAcusado(payload),
    w: Math.max(POS.acusadoBox.w - 0.1, 0.2),
    h: Math.max(POS.acusadoBox.h - 0.05, 0.2),
    baseFontSize: 12,
    minFontSize: 8,
    lineHeightMultiple: 1.0,
    charWidthRatio: 0.6,
    maxLines: 1,
  });

  const etapaFitted = fitTextToBox({
    text: buildEtapaLine(payload),
    w: Math.max(POS.etapaBox.w - 0.1, 0.2),
    h: Math.max(POS.etapaBox.h - 0.05, 0.2),
    baseFontSize: 12,
    minFontSize: 9,
    lineHeightMultiple: 1.0,
    charWidthRatio: 0.6,
    maxLines: 1,
  });

  const hechosFitted = fitTextToBox({
    text: buildHechos(payload),
    w: POS.hechos.w,
    h: POS.hechos.h,
    baseFontSize: 12,
    minFontSize: 9,
    lineHeightMultiple: 1.12,
    charWidthRatio: 0.6,
  });

  const resultadoFitted = fitTextToBox({
    text: buildResultado(payload),
    w: POS.resultado.w,
    h: POS.resultado.h,
    baseFontSize: 12,
    minFontSize: 9,
    lineHeightMultiple: 1.12,
    charWidthRatio: 0.6,
  });

  const datosFitted = fitTextToBox({
    text: "DATOS DE IDENTIFICACIÓN",
    w: POS.identificacion.w,
    h: 0.21,
    baseFontSize: 12,
    minFontSize: 10,
    lineHeightMultiple: 1.0,
    charWidthRatio: 0.65,
    maxLines: 1,
  });
  const cdiFitted = fitTextToBox({
    text: buildCdiLine(payload),
    w: POS.identificacion.w,
    h: 0.21,
    baseFontSize: 11,
    minFontSize: 9,
    lineHeightMultiple: 1.0,
    charWidthRatio: 0.65,
    maxLines: 1,
  });
  const cpFitted = fitTextToBox({
    text: buildCpLine(payload),
    w: POS.identificacion.w,
    h: 0.21,
    baseFontSize: 12,
    minFontSize: 9,
    lineHeightMultiple: 1.0,
    charWidthRatio: 0.65,
    maxLines: 1,
  });

  return (
    <Document>
      <Page size={[pt(POS.slide.widthIn), pt(POS.slide.heightIn)]} style={styles.page}>
        <Image
          src={assets.headerBar}
          style={{
            position: "absolute",
            left: pt(POS.headerBar.x),
            top: pt(POS.headerBar.y),
            width: pt(POS.headerBar.w),
            height: pt(POS.headerBar.h),
          }}
        />

        <View
          style={{
            position: "absolute",
            left: pt(POS.relevancia.x),
            top: pt(POS.relevancia.y),
            width: pt(POS.relevancia.w),
            height: pt(POS.relevancia.h),
            backgroundColor: relevanciaToHex(payload.observaciones.relevancia),
          }}
        />

        <Text
          style={{
            position: "absolute",
            left: pt(POS.delito.x),
            top: pt(POS.delito.y),
            width: pt(POS.delito.w),
            height: pt(POS.delito.h),
            fontSize: delitoFitted.fontSize,
            lineHeight: delitoFitted.fontSize * 1.0,
            color: COLORS.white,
            fontFamily: "Helvetica",
            textAlign: "center",
          }}
        >
          {delitoFitted.text}
        </Text>

        <Text
          style={{
            position: "absolute",
            left: pt(POS.subtitulo.x),
            top: pt(POS.subtitulo.y),
            width: pt(POS.subtitulo.w),
            height: pt(POS.subtitulo.h),
            fontSize: 20,
            lineHeight: 20 * 1.0,
            color: COLORS.white,
            fontFamily: "Helvetica",
            textAlign: "center",
          }}
        >
          {"COORDINACIÓN DE\nLITIGACIÓN"}
        </Text>

        <Image
          src={assets.stripes}
          style={{
            position: "absolute",
            left: pt(POS.stripes.x),
            top: pt(POS.stripes.y),
            width: pt(POS.stripes.w),
            height: pt(POS.stripes.h),
          }}
        />

        <View
          style={{
            position: "absolute",
            left: pt(POS.lugarBox.x),
            top: pt(POS.lugarBox.y),
            width: pt(POS.lugarBox.w),
            height: pt(POS.lugarBox.h),
            backgroundColor: COLORS.beige,
          }}
        />
        <Text
          style={{
            position: "absolute",
            left: pt(POS.lugarBox.x + 0.1),
            top: pt(POS.lugarBox.y + 0.08),
            width: pt(POS.lugarBox.w - 0.2),
            height: pt(POS.lugarBox.h - 0.16),
            fontSize: lugarFitted.fontSize,
            lineHeight: lugarFitted.fontSize * 1.12,
            color: COLORS.black,
            fontFamily: "Times-Roman",
            fontWeight: 700,
            textAlign: "justify",
          }}
        >
          {lugarFitted.text}
        </Text>

        {assets.photo ? (
          <Image
            src={assets.photo}
            style={{
              position: "absolute",
              left: pt(POS.photo.x),
              top: pt(POS.photo.y),
              width: pt(POS.photo.w),
              height: pt(POS.photo.h),
            }}
          />
        ) : (
          <View
            style={{
              position: "absolute",
              left: pt(POS.photo.x),
              top: pt(POS.photo.y),
              width: pt(POS.photo.w),
              height: pt(POS.photo.h),
              backgroundColor: "#F2F2F2",
              borderWidth: 1,
              borderColor: COLORS.labelBorder,
            }}
          />
        )}

        <View
          style={{
            position: "absolute",
            left: pt(POS.acusadoBox.x),
            top: pt(POS.acusadoBox.y),
            width: pt(POS.acusadoBox.w),
            height: pt(POS.acusadoBox.h),
            backgroundColor: COLORS.labelGrey,
            borderWidth: 1,
            borderColor: COLORS.labelBorder,
          }}
        />
        <Text
          style={{
            position: "absolute",
            left: pt(POS.acusadoBox.x),
            top: pt(POS.acusadoBox.y + 0.02),
            width: pt(POS.acusadoBox.w),
            height: pt(POS.acusadoBox.h),
            fontSize: acusadoFitted.fontSize,
            lineHeight: acusadoFitted.fontSize * 1.0,
            color: COLORS.black,
            fontFamily: "Times-Roman",
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          {acusadoFitted.text}
        </Text>

        <Text
          style={{
            position: "absolute",
            left: pt(POS.identificacion.x),
            top: pt(POS.identificacion.y),
            width: pt(POS.identificacion.w),
            height: pt(POS.identificacion.h),
            fontSize: datosFitted.fontSize,
            lineHeight: datosFitted.fontSize * 1.12,
            color: COLORS.black,
            fontFamily: "Times-Roman",
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          {datosFitted.text}
          {"\n"}
          {cdiFitted.text}
        </Text>

        <Text
          style={{
            position: "absolute",
            left: pt(POS.identificacion.x),
            top: pt(POS.identificacion.y + 0.33),
            width: pt(POS.identificacion.w),
            height: pt(POS.identificacion.h),
            fontSize: cpFitted.fontSize,
            lineHeight: cpFitted.fontSize * 1.12,
            color: COLORS.redDark,
            fontFamily: "Times-Roman",
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          {cpFitted.text}
        </Text>

        <View
          style={{
            position: "absolute",
            left: pt(POS.barAzul.x),
            top: pt(POS.barAzul.y),
            width: pt(POS.barAzul.w),
            height: pt(POS.barAzul.h),
            backgroundColor: COLORS.darkBlue,
            borderWidth: 1,
            borderColor: COLORS.beige,
          }}
        />

        <View
          style={{
            position: "absolute",
            left: pt(POS.etapaBox.x),
            top: pt(POS.etapaBox.y),
            width: pt(POS.etapaBox.w),
            height: pt(POS.etapaBox.h),
            backgroundColor: COLORS.white,
            borderWidth: 1,
            borderColor: COLORS.black,
          }}
        />
        <Text
          style={{
            position: "absolute",
            left: pt(POS.etapaBox.x),
            top: pt(POS.etapaBox.y + 0.04),
            width: pt(POS.etapaBox.w),
            height: pt(POS.etapaBox.h),
            fontSize: etapaFitted.fontSize,
            lineHeight: etapaFitted.fontSize * 1.0,
            color: COLORS.redDark,
            fontFamily: "Times-Roman",
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          {etapaFitted.text}
        </Text>

        <Text
          style={{
            position: "absolute",
            left: pt(POS.hechos.x),
            top: pt(POS.hechos.y),
            width: pt(POS.hechos.w),
            height: pt(POS.hechos.h),
            fontSize: hechosFitted.fontSize,
            lineHeight: hechosFitted.fontSize * 1.12,
            color: COLORS.black,
            fontFamily: "Times-Roman",
            fontWeight: 700,
            textAlign: "justify",
          }}
        >
          {hechosFitted.text}
        </Text>

        <View
          style={{
            position: "absolute",
            left: pt(POS.resultadoHeader.x),
            top: pt(POS.resultadoHeader.y),
            width: pt(POS.resultadoHeader.w),
            height: pt(POS.resultadoHeader.h),
            backgroundColor: COLORS.darkBlue,
          }}
        />
        <Text
          style={{
            position: "absolute",
            left: pt(POS.resultadoHeader.x),
            top: pt(POS.resultadoHeader.y + 0.08),
            width: pt(POS.resultadoHeader.w),
            height: pt(POS.resultadoHeader.h),
            fontSize: 12,
            lineHeight: 12 * 1.0,
            color: COLORS.white,
            fontFamily: "Times-Roman",
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          {"Resultado de la\nInvestigación."}
        </Text>

        <Text
          style={{
            position: "absolute",
            left: pt(POS.resultado.x),
            top: pt(POS.resultado.y),
            width: pt(POS.resultado.w),
            height: pt(POS.resultado.h),
            fontSize: resultadoFitted.fontSize,
            lineHeight: resultadoFitted.fontSize * 1.12,
            color: COLORS.black,
            fontFamily: "Times-Roman",
            fontWeight: 700,
            textAlign: "justify",
          }}
        >
          {resultadoFitted.text}
        </Text>

        <Image
          src={assets.footerLogo}
          style={{
            position: "absolute",
            left: pt(POS.footerLogo.x),
            top: pt(POS.footerLogo.y),
            width: pt(POS.footerLogo.w),
            height: pt(POS.footerLogo.h),
          }}
        />
        <Image
          src={assets.footerSlogan}
          style={{
            position: "absolute",
            left: pt(POS.footerSlogan.x),
            top: pt(POS.footerSlogan.y),
            width: pt(POS.footerSlogan.w),
            height: pt(POS.footerSlogan.h),
          }}
        />
      </Page>
    </Document>
  );
}
