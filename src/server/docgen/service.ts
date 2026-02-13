import React from "react";
import { pdf, type DocumentProps } from "@react-pdf/renderer";

import type { FichaPayload } from "@/lib/validators";
import { SigeaPdf } from "@/server/docgen/pdf";
import { generateFichaPptx } from "@/server/docgen/ficha";
import { generateMamparaPptx, type MamparaPptxOptions } from "@/server/docgen/mampara";
import { mapPayloadToTemplate } from "@/server/docgen/template";

export type PptxTemplate = "mampara" | "ficha";

export type GeneratePptxOptions = MamparaPptxOptions & {
  template?: PptxTemplate;
};

export async function generatePptx(payload: FichaPayload, options: GeneratePptxOptions = {}) {
  const template = options.template ?? "mampara";

  if (template === "ficha") {
    return generateFichaPptx(payload);
  }

  return generateMamparaPptx(payload, { photoPath: options.photoPath ?? null });
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
