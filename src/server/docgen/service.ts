import type { FichaPayload } from "@/lib/validators";
import { generateFichaPptx } from "@/server/docgen/ficha";
import { generateMamparaPptx, type MamparaPptxOptions } from "@/server/docgen/mampara";
import { generateTarjetaPptx, type TarjetaPptxOptions } from "@/server/docgen/tarjeta";
import { convertPptxBufferToPdf } from "@/server/docgen/soffice";

export type PptxTemplate = "mampara" | "tarjeta" | "ficha";

export type GeneratePptxOptions = MamparaPptxOptions &
  TarjetaPptxOptions & {
  template?: PptxTemplate;
};

export type GeneratePdfOptions = MamparaPptxOptions &
  TarjetaPptxOptions & {
  template?: PptxTemplate;
};

export async function generatePptx(payload: FichaPayload, options: GeneratePptxOptions = {}) {
  const template = options.template ?? "mampara";

  if (template === "ficha") {
    return generateFichaPptx(payload);
  }

  if (template === "tarjeta") {
    return generateTarjetaPptx(payload, { photoPath: options.photoPath ?? null });
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
  });

  return convertPptxBufferToPdf(pptxBuffer);
}
