import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { TemplateMapped } from "@/server/docgen/template";

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1b1b1b",
  },
  agency: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 4,
  },
  title: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 10,
  },
  section: {
    borderWidth: 1,
    borderColor: "#222",
    padding: 6,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    marginBottom: 2,
  },
  sectionBody: {
    fontSize: 9,
    lineHeight: 1.35,
  },
});

type SigeaPdfProps = {
  agencyName: string;
  reportTitle: string;
  mapped: TemplateMapped;
};

export function SigeaPdf({ agencyName, reportTitle, mapped }: SigeaPdfProps) {
  const sections = [
    ["1) EXPEDIENTES", mapped.section1],
    ["2) FECHA Y HORA", mapped.section2],
    ["3) DELITO", mapped.section3],
    ["4) IMPUTADO", mapped.section4],
    ["5) OFENDIDO", mapped.section5],
    ["6) HECHO", mapped.section6],
    ["7) TIPO DE AUDIENCIA", mapped.section7],
    ["8) AUTORIDADES", mapped.section8],
    ["9) RESULTADO", mapped.section9],
    ["10) MEDIDA CAUTELAR", mapped.section10],
    ["11) OBSERVACIONES", mapped.section11],
  ] as const;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.agency}>{agencyName}</Text>
        <Text style={styles.title}>{reportTitle}</Text>
        {sections.map(([title, body]) => (
          <View key={title} style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionBody}>{body || "-"}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}
