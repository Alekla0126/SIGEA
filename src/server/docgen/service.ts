import React from "react";
import { pdf, type DocumentProps } from "@react-pdf/renderer";
import PptxGenJS from "pptxgenjs";

import type { FichaPayload } from "@/lib/validators";
import { SigeaPdf } from "@/server/docgen/pdf";
import { fitText, mapPayloadToTemplate } from "@/server/docgen/template";

type SectionLayout = {
  key: keyof ReturnType<typeof mapPayloadToTemplate>;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  baseLimit: number;
};

const sectionLayouts: SectionLayout[] = [
  { key: "section1", title: "1) EXPEDIENTES", x: 0.3, y: 1.15, w: 6.35, h: 0.9, baseLimit: 350 },
  { key: "section2", title: "2) FECHA Y HORA", x: 6.8, y: 1.15, w: 6.2, h: 0.9, baseLimit: 320 },
  { key: "section3", title: "3) DELITO", x: 0.3, y: 2.15, w: 6.35, h: 0.7, baseLimit: 280 },
  { key: "section4", title: "4) IMPUTADO", x: 6.8, y: 2.15, w: 6.2, h: 0.7, baseLimit: 280 },
  { key: "section5", title: "5) OFENDIDO", x: 0.3, y: 2.95, w: 6.35, h: 0.7, baseLimit: 280 },
  { key: "section6", title: "6) HECHO", x: 6.8, y: 2.95, w: 6.2, h: 1.45, baseLimit: 520 },
  { key: "section7", title: "7) TIPO AUDIENCIA", x: 0.3, y: 3.75, w: 6.35, h: 0.95, baseLimit: 360 },
  { key: "section8", title: "8) AUTORIDADES", x: 0.3, y: 4.8, w: 6.35, h: 1.4, baseLimit: 540 },
  { key: "section9", title: "9) RESULTADO", x: 6.8, y: 4.5, w: 6.2, h: 0.8, baseLimit: 300 },
  { key: "section10", title: "10) MEDIDA CAUTELAR", x: 6.8, y: 5.4, w: 6.2, h: 0.85, baseLimit: 320 },
  { key: "section11", title: "11) OBSERVACIONES", x: 0.3, y: 6.3, w: 12.7, h: 0.95, baseLimit: 600 },
];

export async function generatePptx(payload: FichaPayload) {
  const mapped = mapPayloadToTemplate(payload);
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "SIGEA";
  pptx.subject = "Reporte de participacion ministerial";
  pptx.company = "SIGEA";

  const slide = pptx.addSlide();
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.2,
    y: 0.2,
    w: 12.9,
    h: 7.1,
    line: { color: "003049", pt: 1 },
    fill: { color: "FFFFFF", transparency: 100 },
  });

  slide.addText(payload.agencyName, {
    x: 0.4,
    y: 0.35,
    w: 12.4,
    h: 0.25,
    bold: true,
    fontFace: "Arial",
    fontSize: 13,
    color: "0B2E4F",
    align: "center",
  });

  slide.addText(payload.reportTitle, {
    x: 0.4,
    y: 0.66,
    w: 12.4,
    h: 0.24,
    bold: true,
    fontFace: "Arial",
    fontSize: 11,
    color: "0B2E4F",
    align: "center",
  });

  for (const section of sectionLayouts) {
    const value = mapped[section.key];
    const adjusted = fitText(value, 12, 9, section.baseLimit);

    slide.addShape(pptx.ShapeType.roundRect, {
      x: section.x,
      y: section.y,
      w: section.w,
      h: section.h,
      line: { color: "8D99AE", pt: 0.7 },
      fill: { color: "F8FAFC" },
    });

    slide.addText(section.title, {
      x: section.x + 0.08,
      y: section.y + 0.04,
      w: section.w - 0.16,
      h: 0.15,
      bold: true,
      fontFace: "Arial",
      fontSize: 8.5,
      color: "1D3557",
    });

    slide.addText(adjusted.text || "-", {
      x: section.x + 0.08,
      y: section.y + 0.22,
      w: section.w - 0.16,
      h: section.h - 0.24,
      fontFace: "Arial",
      fontSize: adjusted.fontSize,
      color: "111827",
      valign: "top",
      breakLine: true,
    });
  }

  return (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
}

export async function generatePdf(payload: FichaPayload) {
  const mapped = mapPayloadToTemplate(payload);
  const documentElement = React.createElement(SigeaPdf, {
    agencyName: payload.agencyName,
    reportTitle: payload.reportTitle,
    mapped,
  }) as unknown as React.ReactElement<DocumentProps>;

  const instance = pdf(documentElement);

  const output = await instance.toBuffer();

  if (Buffer.isBuffer(output)) {
    return output;
  }

  if (output instanceof Uint8Array) {
    return Buffer.from(output);
  }

  const maybeWebStream = output as unknown as {
    getReader?: () => {
      read: () => Promise<{ done: boolean; value?: Uint8Array }>;
    };
  };

  if (typeof maybeWebStream.getReader === "function") {
    const reader = maybeWebStream.getReader();
    const chunks: Uint8Array[] = [];
    let done = false;

    while (!done) {
      const next = await reader.read();
      done = next.done;
      if (next.value) {
        chunks.push(next.value);
      }
    }

    return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  }

  const maybeNodeStream = output as unknown as {
    on?: (event: string, listener: (...args: unknown[]) => void) => void;
  };

  if (typeof maybeNodeStream.on === "function") {
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      maybeNodeStream.on?.("data", (chunk: unknown) => {
        if (Buffer.isBuffer(chunk)) {
          chunks.push(chunk);
          return;
        }

        if (chunk instanceof Uint8Array) {
          chunks.push(Buffer.from(chunk));
          return;
        }

        if (typeof chunk === "string") {
          chunks.push(Buffer.from(chunk));
        }
      });
      maybeNodeStream.on?.("end", () => resolve());
      maybeNodeStream.on?.("error", (error: unknown) => reject(error));
    });

    return Buffer.concat(chunks);
  }

  return Buffer.from([]);
}
