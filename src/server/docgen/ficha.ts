import path from "node:path";

import PptxGenJS from "pptxgenjs";

import type { FichaPayload } from "@/lib/validators";
import { mapPayloadToTemplate } from "@/server/docgen/template";
import { fitTextToBox } from "@/server/docgen/text-fit";

type BorderProps = PptxGenJS.BorderProps;
type TableCell = PptxGenJS.TableCell;
type TableCellProps = PptxGenJS.TableCellProps;
type TableProps = PptxGenJS.TableProps;
type TableRow = PptxGenJS.TableRow;

function assetsPath(fileName: string) {
  return path.join(process.cwd(), "assets", "ficha", fileName);
}

const LAYOUT = {
  logoRight: { x: 7.858, y: 0.283, w: 1.746, h: 0.504 },
  logoLeft: { x: 0.421, y: 0.31, w: 0.563, h: 0.605 },
  title1: { x: 2.709, y: 0.525, w: 3.614, h: 0.262 },
  title2: { x: 1.939, y: 0.311, w: 5.151, h: 0.27 },
  table: { x: 0.263, y: 1.249, w: 9.462, h: 4.041 },
} as const;

const TABLE = {
  colW: [1.429, 4.223, 3.807],
  rowH: [0.305, 0.374, 0.305, 0.305, 0.305, 0.72, 0.305, 0.305, 0.294, 0.305, 0.305],
} as const;

const BORDER: BorderProps = { type: "solid", color: "000000", pt: 0.96 };
const CELL_MARGIN: [number, number, number, number] = [0.049, 0.073, 0.049, 0.073];

function labelCell(text: string): TableCell {
  return {
    text,
    options: {
      bold: true,
      valign: "middle",
      align: "left",
    },
  };
}

function fittedValueCell(text: string, boxW: number, boxH: number, options: { colspan?: number } = {}): TableCell {
  const paddingX = (CELL_MARGIN[1] ?? 0) + (CELL_MARGIN[3] ?? 0);
  const paddingY = (CELL_MARGIN[0] ?? 0) + (CELL_MARGIN[2] ?? 0);

  const fitted = fitTextToBox({
    text,
    w: Math.max(boxW - paddingX, 0.1),
    h: Math.max(boxH - paddingY, 0.1),
    baseFontSize: 8.5,
    minFontSize: 6.5,
    lineHeightMultiple: 1.12,
    charWidthRatio: 0.6,
  });

  return {
    text: fitted.text,
    options: {
      fontSize: fitted.fontSize,
      valign: "top",
      align: "left",
      colspan: options.colspan,
    },
  };
}

function joinNonEmptyLines(lines: Array<string | null | undefined>) {
  return lines
    .map((line) => (line || "").toString().trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

export async function generateFichaPptx(payload: FichaPayload) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_4x3";
  pptx.author = "SIGEA";
  pptx.company = "SIGEA";
  pptx.subject = "Ficha";

  const slide = pptx.addSlide();

  slide.addImage({
    path: assetsPath("logo-fiscalia.png"),
    ...LAYOUT.logoRight,
  });

  slide.addImage({
    path: assetsPath("escudo.png"),
    ...LAYOUT.logoLeft,
  });

  slide.addText(payload.agencyName, {
    ...LAYOUT.title1,
    fontFace: "Lucida Fax",
    fontSize: 9.77,
    bold: true,
    color: "A6A6A6",
    align: "center",
    valign: "middle",
  });

  slide.addText(payload.reportTitle, {
    ...LAYOUT.title2,
    fontFace: "Lucida Fax",
    fontSize: 9.77,
    bold: true,
    color: "A6A6A6",
    align: "center",
    valign: "middle",
  });

  const mapped = mapPayloadToTemplate(payload);

  const col2 = TABLE.colW[1];
  const col3 = TABLE.colW[2];
  const mergedW = col2 + col3;

  const rows: TableRow[] = [
    [
      labelCell("EXPEDIENTES"),
      fittedValueCell(`CDI: ${payload.expedientes.cdi}`, col2, TABLE.rowH[0]),
      fittedValueCell(`CP: ${payload.expedientes.cp}`, col3, TABLE.rowH[0]),
    ],
    [
      labelCell("FECHA Y HORA"),
      fittedValueCell(payload.fechaHora.fecha, col2, TABLE.rowH[1]),
      fittedValueCell(
        joinNonEmptyLines([
          payload.fechaHora.horaProgramada,
          payload.fechaHora.horaInicio ? `HORA INICIO: ${payload.fechaHora.horaInicio}` : "",
          payload.fechaHora.horaTermino ? `HORA TERMINO: ${payload.fechaHora.horaTermino}` : "",
        ]),
        col3,
        TABLE.rowH[1],
      ),
    ],
    [labelCell("DELITO"), fittedValueCell(payload.delito.nombre, mergedW, TABLE.rowH[2], { colspan: 2 })],
    [
      labelCell("IMPUTADO"),
      fittedValueCell(payload.imputado.nombreCompleto, mergedW, TABLE.rowH[3], { colspan: 2 }),
    ],
    [
      labelCell("OFENDIDO"),
      fittedValueCell(payload.ofendido.nombreCompleto, mergedW, TABLE.rowH[4], { colspan: 2 }),
    ],
    [labelCell("HECHO"), fittedValueCell(payload.hecho.descripcion, mergedW, TABLE.rowH[5], { colspan: 2 })],
    [
      labelCell("TIPO DE AUDIENCIA"),
      fittedValueCell(mapped.section7, mergedW, TABLE.rowH[6], { colspan: 2 }),
    ],
    [labelCell("JUEZ"), fittedValueCell(mapped.section8, mergedW, TABLE.rowH[7], { colspan: 2 })],
    [labelCell("RESULTADO"), fittedValueCell(payload.resultado.descripcion, mergedW, TABLE.rowH[8], { colspan: 2 })],
    [
      labelCell("MEDIDA CAUTELAR"),
      fittedValueCell(mapped.section10, mergedW, TABLE.rowH[9], { colspan: 2 }),
    ],
    [
      labelCell("OBSERVACIONES"),
      fittedValueCell(mapped.section11, mergedW, TABLE.rowH[10], { colspan: 2 }),
    ],
  ];

  const tableProps: TableProps = {
    ...LAYOUT.table,
    colW: TABLE.colW as unknown as number[],
    rowH: TABLE.rowH as unknown as number[],
    fontFace: "Lucida Fax",
    fontSize: 8.5,
    color: "000000",
    fill: { color: "FFFFFF" },
    margin: CELL_MARGIN,
    border: [BORDER, BORDER, BORDER, BORDER],
    align: "left",
    valign: "top",
  };

  slide.addTable(rows, tableProps);

  return (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
}
