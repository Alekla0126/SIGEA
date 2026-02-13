import type { FichaPayload } from "@/lib/validators";
import type { TemplateMapped } from "@/server/docgen/template";
import { mapPayloadToTemplate } from "@/server/docgen/template";

export const FICHA_SLIDE = {
  widthIn: 13.333,
  heightIn: 7.5,
} as const;

export const FICHA_HEADER = {
  agency: { x: 0.4, y: 0.35, w: 12.4, h: 0.25, fontSize: 13 },
  title: { x: 0.4, y: 0.68, w: 12.4, h: 0.22, fontSize: 11 },
} as const;

export const FICHA_BOXES: Array<{ key: keyof TemplateMapped; x: number; y: number; w: number; h: number }> = [
  { key: "section1", x: 0.3, y: 1.15, w: 6.35, h: 0.9 },
  { key: "section2", x: 6.8, y: 1.15, w: 6.2, h: 0.9 },
  { key: "section3", x: 0.3, y: 2.15, w: 6.35, h: 0.7 },
  { key: "section4", x: 6.8, y: 2.15, w: 6.2, h: 0.7 },
  { key: "section5", x: 0.3, y: 2.95, w: 6.35, h: 0.7 },
  { key: "section6", x: 6.8, y: 2.95, w: 6.2, h: 1.45 },
  { key: "section7", x: 0.3, y: 3.75, w: 6.35, h: 0.95 },
  { key: "section8", x: 0.3, y: 4.8, w: 6.35, h: 1.4 },
  { key: "section9", x: 6.8, y: 4.5, w: 6.2, h: 0.8 },
  { key: "section10", x: 6.8, y: 5.4, w: 6.2, h: 0.85 },
  { key: "section11", x: 0.3, y: 6.3, w: 12.7, h: 0.95 },
] as const;

function inline(label: string, value: string) {
  const trimmed = (value || "").toString().trim();
  return trimmed ? `${label} ${trimmed}` : label;
}

function block(label: string, value: string) {
  const trimmed = (value || "").toString().trim();
  return trimmed ? `${label}\n${trimmed}` : label;
}

export function mapPayloadToFichaBoxes(payload: FichaPayload): TemplateMapped {
  const mapped = mapPayloadToTemplate(payload);

  return {
    section1: block("EXPEDIENTES:", mapped.section1),
    section2: block("FECHA Y HORA:", mapped.section2),
    section3: inline("DELITO:", mapped.section3),
    section4: inline("IMPUTADO:", mapped.section4),
    section5: inline("OFENDIDO:", mapped.section5),
    section6: inline("HECHO:", mapped.section6),
    section7: block("TIPO AUDIENCIA:", mapped.section7),
    section8: block("AUTORIDADES:", mapped.section8),
    section9: inline("RESULTADO:", mapped.section9),
    section10: block("MEDIDA CAUTELAR:", mapped.section10),
    section11: block("OBSERVACIONES:", mapped.section11),
  };
}

