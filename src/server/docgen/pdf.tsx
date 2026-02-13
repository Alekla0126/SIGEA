import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { TemplateMapped } from "@/server/docgen/template";
import { FICHA_BOXES, FICHA_HEADER, FICHA_SLIDE } from "@/server/docgen/ficha-layout";
import { fitTextToBox } from "@/server/docgen/text-fit";

const COLORS = {
  header: "#0B2E4F",
  border: "#8D99AE",
  fill: "#F8FAFC",
  text: "#0F172A",
} as const;

const TEXT_INSET = {
  x: 0.08,
  y: 0.22,
  w: 0.16,
  h: 0.24,
} as const;

function pt(inches: number) {
  return inches * 72;
}

const styles = StyleSheet.create({
  page: {
    position: "relative",
    backgroundColor: "#FFFFFF",
    width: pt(FICHA_SLIDE.widthIn),
    height: pt(FICHA_SLIDE.heightIn),
  },
  agency: {
    position: "absolute",
    left: pt(FICHA_HEADER.agency.x),
    top: pt(FICHA_HEADER.agency.y),
    width: pt(FICHA_HEADER.agency.w),
    height: pt(FICHA_HEADER.agency.h),
    fontSize: FICHA_HEADER.agency.fontSize,
    color: COLORS.header,
    fontFamily: "Times-Roman",
    fontWeight: 700,
    textAlign: "center",
  },
  title: {
    position: "absolute",
    left: pt(FICHA_HEADER.title.x),
    top: pt(FICHA_HEADER.title.y),
    width: pt(FICHA_HEADER.title.w),
    height: pt(FICHA_HEADER.title.h),
    fontSize: FICHA_HEADER.title.fontSize,
    color: COLORS.header,
    fontFamily: "Times-Roman",
    fontWeight: 700,
    textAlign: "center",
  },
});

type SigeaFichaPdfProps = {
  agencyName: string;
  reportTitle: string;
  mapped: TemplateMapped;
};

export function SigeaFichaPdf({ agencyName, reportTitle, mapped }: SigeaFichaPdfProps) {
  return (
    <Document>
      <Page size={[pt(FICHA_SLIDE.widthIn), pt(FICHA_SLIDE.heightIn)]} style={styles.page}>
        <Text style={styles.agency}>{agencyName}</Text>
        <Text style={styles.title}>{reportTitle}</Text>

        {FICHA_BOXES.map((box) => {
          const content = mapped[box.key] || "";
          const fitted = fitTextToBox({
            text: content,
            w: Math.max(box.w - TEXT_INSET.w, 0.2),
            h: Math.max(box.h - TEXT_INSET.h, 0.2),
            baseFontSize: 10,
            minFontSize: 7,
            lineHeightMultiple: 1.16,
            charWidthRatio: 0.57,
          });

          return (
            <View
              key={box.key}
              style={{
                position: "absolute",
                left: pt(box.x),
                top: pt(box.y),
                width: pt(box.w),
                height: pt(box.h),
                borderWidth: 0.7,
                borderColor: COLORS.border,
                backgroundColor: COLORS.fill,
                borderRadius: 10,
                paddingLeft: pt(TEXT_INSET.x),
                paddingRight: pt(TEXT_INSET.x),
                paddingTop: pt(TEXT_INSET.y),
                paddingBottom: 2,
              }}
            >
              <Text
                style={{
                  fontSize: fitted.fontSize,
                  lineHeight: fitted.fontSize * 1.16,
                  color: COLORS.text,
                  fontFamily: "Helvetica",
                }}
              >
                {fitted.text}
              </Text>
            </View>
          );
        })}
      </Page>
    </Document>
  );
}

