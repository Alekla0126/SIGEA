import fs from "node:fs/promises";
import path from "node:path";

import JSZip from "jszip";

function replaceSlideList(presentationXml: string, slideRelId: string, slideNumericId: string) {
  const next = `<p:sldIdLst><p:sldId id="${slideNumericId}" r:id="${slideRelId}"/></p:sldIdLst>`;
  return presentationXml.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, next);
}

function replaceTextNodes(xml: string, texts: string[]) {
  let idx = 0;
  return xml.replace(
    /(<a:t(?:\s[^>]*)?>)([\s\S]*?)(<\/a:t>)/g,
    (_match, open: string, _text: string, close: string) => {
      const value = texts[idx] ?? "";
      idx += 1;
      return `${open}${value}${close}`;
    },
  );
}

function replaceTablePlaceholders(slideXml: string) {
  const tableStart = slideXml.indexOf("<a:tbl>");
  const tableEnd = slideXml.indexOf("</a:tbl>");
  if (tableStart === -1 || tableEnd === -1 || tableEnd <= tableStart) {
    throw new Error("No se encontro <a:tbl> en slide XML");
  }

  const tblXml = slideXml.slice(tableStart, tableEnd + "</a:tbl>".length);
  const rowRegex = /<a:tr\b[^>]*>[\s\S]*?<\/a:tr>/g;
  const cellRegex = /<a:tc\b[^>]*>[\s\S]*?<\/a:tc>/g;

  const tokensByRow: Array<{ cell1?: string; cell2?: string | string[] }> = [
    { cell1: "{{CDI}}", cell2: "{{CP}}" },
    { cell1: "{{FECHA}}", cell2: ["{{HORA_1}}", "{{HORA_2}}"] },
    { cell1: "{{DELITO}}" },
    { cell1: "{{IMPUTADO}}" },
    { cell1: "{{OFENDIDO}}" },
    { cell1: "{{HECHO}}" },
    { cell1: "{{TIPO_AUDIENCIA}}" },
    { cell1: "{{JUEZ}}" },
    { cell1: "{{RESULTADO}}" },
    { cell1: "{{MEDIDA_CAUTELAR}}" },
    { cell1: "{{OBSERVACIONES}}" },
  ];

  let rowIdx = 0;
  const nextTblXml = tblXml.replace(rowRegex, (rowXml) => {
    const tokens = tokensByRow[rowIdx];
    rowIdx += 1;
    if (!tokens) {
      return rowXml;
    }

    let cellIdx = 0;
    return rowXml.replace(cellRegex, (cellXml) => {
      const nextCellIdx = cellIdx;
      cellIdx += 1;

      if (rowIdx === 1 || rowIdx === 2) {
        // Rows 0-1: 3 columnas visibles (CDI/CP, Fecha/Hora).
        if (nextCellIdx === 1 && tokens.cell1) {
          return replaceTextNodes(cellXml, [tokens.cell1]);
        }
        if (nextCellIdx === 2 && tokens.cell2) {
          const values = Array.isArray(tokens.cell2) ? tokens.cell2 : [tokens.cell2];
          return replaceTextNodes(cellXml, values);
        }
        return cellXml;
      }

      // Resto: la celda de valor es la segunda (gridSpan=2). La tercera es hMerge y se deja intacta.
      if (nextCellIdx === 1 && tokens.cell1) {
        return replaceTextNodes(cellXml, [tokens.cell1]);
      }

      return cellXml;
    });
  });

  if (rowIdx < 11) {
    throw new Error(`Tabla inesperada: filas encontradas=${rowIdx}`);
  }

  return slideXml.slice(0, tableStart) + nextTblXml + slideXml.slice(tableEnd + "</a:tbl>".length);
}

async function main() {
  const inputPath = path.resolve("FICHAS.pptx");
  const outputPath = path.resolve("assets/templates/ficha_template.pptx");
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const buffer = await fs.readFile(inputPath);
  const zip = await JSZip.loadAsync(buffer);

  const presentationPath = "ppt/presentation.xml";
  const presentationXml = await zip.file(presentationPath)?.async("string");
  if (!presentationXml) {
    throw new Error(`No se encontro ${presentationPath}`);
  }

  // En `FICHAS.pptx` la tabla esta en `slide8.xml` y se referencia con `rId9`.
  zip.file(presentationPath, replaceSlideList(presentationXml, "rId9", "286"));

  const slidePath = "ppt/slides/slide8.xml";
  const slideXmlRaw = await zip.file(slidePath)?.async("string");
  if (!slideXmlRaw) {
    throw new Error(`No se encontro ${slidePath}`);
  }

  let slideXml = slideXmlRaw;
  slideXml = slideXml.replace(
    "FISCALIA DE INVESTIGACIÓN METROPOLITANA",
    "{{AGENCY_NAME}}",
  );
  slideXml = slideXml.replace(
    "REPORTE DE PARTICIPACIÓN MINISTERIAL EN AUDIENCIA JUDICIAL",
    "{{REPORT_TITLE}}",
  );
  slideXml = replaceTablePlaceholders(slideXml);

  zip.file(slidePath, slideXml);

  const out = await zip.generateAsync({ type: "nodebuffer" });
  await fs.writeFile(outputPath, out);
  console.log(`Template ficha generado: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
