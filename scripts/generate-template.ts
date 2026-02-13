import fs from "node:fs/promises";
import path from "node:path";

import PptxGenJS from "pptxgenjs";

async function main() {
  const outputPath = path.resolve("assets/templates/sigea_template.pptx");
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  const slide = pptx.addSlide();

  slide.addText("FISCALIA DE INVESTIGACION METROPOLITANA", {
    x: 0.4,
    y: 0.35,
    w: 12.4,
    h: 0.25,
    bold: true,
    fontSize: 13,
    align: "center",
    color: "0B2E4F",
  });

  slide.addText("REPORTE DE PARTICIPACION MINISTERIAL EN AUDIENCIA JUDICIAL", {
    x: 0.4,
    y: 0.68,
    w: 12.4,
    h: 0.22,
    bold: true,
    fontSize: 11,
    align: "center",
    color: "0B2E4F",
  });

  const placeholders = [
    ["{{SECTION_1}}", 0.3, 1.15, 6.35, 0.9],
    ["{{SECTION_2}}", 6.8, 1.15, 6.2, 0.9],
    ["{{SECTION_3}}", 0.3, 2.15, 6.35, 0.7],
    ["{{SECTION_4}}", 6.8, 2.15, 6.2, 0.7],
    ["{{SECTION_5}}", 0.3, 2.95, 6.35, 0.7],
    ["{{SECTION_6}}", 6.8, 2.95, 6.2, 1.45],
    ["{{SECTION_7}}", 0.3, 3.75, 6.35, 0.95],
    ["{{SECTION_8}}", 0.3, 4.8, 6.35, 1.4],
    ["{{SECTION_9}}", 6.8, 4.5, 6.2, 0.8],
    ["{{SECTION_10}}", 6.8, 5.4, 6.2, 0.85],
    ["{{SECTION_11}}", 0.3, 6.3, 12.7, 0.95],
  ] as const;

  for (const [token, x, y, w, h] of placeholders) {
    slide.addShape(pptx.ShapeType.roundRect, {
      x,
      y,
      w,
      h,
      line: { color: "8D99AE", pt: 0.7 },
      fill: { color: "F8FAFC" },
    });

    slide.addText(token, {
      x: x + 0.08,
      y: y + 0.22,
      w: w - 0.16,
      h: h - 0.24,
      fontSize: 9,
      color: "718096",
    });
  }

  await pptx.writeFile({ fileName: outputPath });
  console.log(`Template generado: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
