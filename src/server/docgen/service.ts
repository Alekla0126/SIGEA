import type { FichaPayload } from "@/lib/validators";
import { generateFichaPptx } from "@/server/docgen/ficha";
import { generateMamparaPptx, type MamparaPptxOptions } from "@/server/docgen/mampara";
import { convertPptxBufferToPdf } from "@/server/docgen/soffice";

export type PptxTemplate = "mampara" | "ficha";

export type GeneratePptxOptions = MamparaPptxOptions & {
  template?: PptxTemplate;
};

export type GeneratePdfOptions = MamparaPptxOptions & {
  template?: PptxTemplate;
};

export async function generatePptx(payload: FichaPayload, options: GeneratePptxOptions = {}) {
  const template = options.template ?? "mampara";

  if (template === "ficha") {
    return generateFichaPptx(payload, { photoPath: options.photoPath ?? null });
  }

  return generateMamparaPptx(payload, { photoPath: options.photoPath ?? null });
}

export async function generatePdf(payload: FichaPayload, options: GeneratePdfOptions = {}) {
  const template = options.template ?? "ficha";

  if (template !== "ficha") {
    throw new Error(`PDF template no soportado: ${template}`);
  }

  // Garantiza que el PDF sea exactamente el mismo layout que el PPTX:
  // generamos el PPTX (template ficha) y lo convertimos con LibreOffice.
  const pptxBuffer = await generatePptx(payload, {
    template: "ficha",
    photoPath: options.photoPath ?? null,
  });

  return convertPptxBufferToPdf(pptxBuffer);
}
