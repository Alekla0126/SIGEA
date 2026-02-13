import PptxGenJS from "pptxgenjs";

import type { FichaPayload } from "@/lib/validators";
import { FICHA_BOXES, FICHA_HEADER, mapPayloadToFichaBoxes } from "@/server/docgen/ficha-layout";
import { fitTextToBox } from "@/server/docgen/text-fit";

const COLORS = {
  header: "0B2E4F",
  border: "8D99AE",
  fill: "F8FAFC",
  text: "0F172A",
} as const;

const TEXT_INSET = {
  x: 0.08,
  y: 0.22,
  w: 0.16,
  h: 0.24,
} as const;

export async function generateFichaPptx(payload: FichaPayload) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "SIGEA";
  pptx.company = "SIGEA";
  pptx.subject = "Ficha";

  const slide = pptx.addSlide();

  slide.addText(payload.agencyName, {
    ...FICHA_HEADER.agency,
    bold: true,
    fontSize: FICHA_HEADER.agency.fontSize,
    align: "center",
    color: COLORS.header,
    fontFace: "Times New Roman",
  });

  slide.addText(payload.reportTitle, {
    ...FICHA_HEADER.title,
    bold: true,
    fontSize: FICHA_HEADER.title.fontSize,
    align: "center",
    color: COLORS.header,
    fontFace: "Times New Roman",
  });

  const sections = mapPayloadToFichaBoxes(payload);

  for (const box of FICHA_BOXES) {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
      line: { color: COLORS.border, pt: 0.7 },
      fill: { color: COLORS.fill },
    });

    const content = sections[box.key] || "";
    const fitted = fitTextToBox({
      text: content,
      w: Math.max(box.w - TEXT_INSET.w, 0.2),
      h: Math.max(box.h - TEXT_INSET.h, 0.2),
      baseFontSize: 10,
      minFontSize: 7,
      lineHeightMultiple: 1.16,
      charWidthRatio: 0.57,
    });

    slide.addText(fitted.text, {
      x: box.x + TEXT_INSET.x,
      y: box.y + TEXT_INSET.y,
      w: Math.max(box.w - TEXT_INSET.w, 0.2),
      h: Math.max(box.h - TEXT_INSET.h, 0.2),
      fontFace: "Arial",
      fontSize: fitted.fontSize,
      color: COLORS.text,
      align: "left",
      valign: "top",
      breakLine: true,
    });
  }

  return (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
}

