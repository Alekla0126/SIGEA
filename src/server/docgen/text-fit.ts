export type FitTextResult = {
  text: string;
  fontSize: number;
};

export type FitTextToBoxOptions = {
  text: string;
  /**
   * Box width in inches.
   */
  w: number;
  /**
   * Box height in inches.
   */
  h: number;
  baseFontSize: number;
  minFontSize: number;
  /**
   * Approx line height multiplier (e.g. 1.2).
   */
  lineHeightMultiple?: number;
  /**
   * Average character width as a ratio of font size.
   * Higher values are more conservative (less chars/line).
   */
  charWidthRatio?: number;
  /**
   * Optional hard cap for lines (otherwise inferred from height).
   */
  maxLines?: number;
};

const DEFAULT_LINE_HEIGHT = 1.2;
const DEFAULT_CHAR_WIDTH_RATIO = 0.55;

function normalizeText(value: string) {
  return (value || "").toString().replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

function estimateMaxCharsPerLine(wInches: number, fontSize: number, charWidthRatio: number) {
  const widthPt = Math.max(wInches, 0.01) * 72;
  const avgCharPt = Math.max(fontSize * charWidthRatio, 1);
  return Math.max(1, Math.floor(widthPt / avgCharPt));
}

function estimateMaxLines(hInches: number, fontSize: number, lineHeightMultiple: number) {
  const heightPt = Math.max(hInches, 0.01) * 72;
  const linePt = Math.max(fontSize * lineHeightMultiple, 1);
  return Math.max(1, Math.floor(heightPt / linePt));
}

function wrapParagraph(paragraph: string, maxChars: number) {
  const words = paragraph.split(/\s+/g).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  const pushCurrent = () => {
    if (current.length > 0) {
      lines.push(current);
      current = "";
    }
  };

  for (const word of words) {
    if (current.length === 0) {
      if (word.length <= maxChars) {
        current = word;
        continue;
      }

      // Hard-break very long tokens.
      let rest = word;
      while (rest.length > maxChars) {
        lines.push(rest.slice(0, maxChars));
        rest = rest.slice(maxChars);
      }
      current = rest;
      continue;
    }

    const candidate = `${current} ${word}`;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    pushCurrent();

    if (word.length <= maxChars) {
      current = word;
      continue;
    }

    let rest = word;
    while (rest.length > maxChars) {
      lines.push(rest.slice(0, maxChars));
      rest = rest.slice(maxChars);
    }
    current = rest;
  }

  pushCurrent();
  return lines.length > 0 ? lines : [""];
}

function wrapTextToLines(text: string, maxCharsPerLine: number) {
  const paragraphs = text.split("\n");
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) {
      lines.push("");
      continue;
    }

    lines.push(...wrapParagraph(trimmed, maxCharsPerLine));
  }

  // Avoid trailing empty lines.
  while (lines.length > 0 && lines[lines.length - 1]?.trim().length === 0) {
    lines.pop();
  }

  return lines;
}

function truncateToFit(lines: string[], maxLines: number, maxCharsPerLine: number) {
  if (lines.length <= maxLines) {
    return lines;
  }

  const kept = lines.slice(0, maxLines);

  const lastIdx = kept.length - 1;
  const base = kept[lastIdx] ?? "";
  const ellipsis = "...";

  let clipped = base;
  if (clipped.length > maxCharsPerLine) {
    clipped = clipped.slice(0, maxCharsPerLine).trimEnd();
  }

  if (maxCharsPerLine <= ellipsis.length) {
    kept[lastIdx] = ellipsis.slice(0, maxCharsPerLine);
    return kept;
  }

  if (clipped.length + ellipsis.length > maxCharsPerLine) {
    clipped = clipped.slice(0, Math.max(0, maxCharsPerLine - ellipsis.length)).trimEnd();
  }

  kept[lastIdx] = `${clipped}${ellipsis}`;
  return kept;
}

export function fitTextToBox(options: FitTextToBoxOptions): FitTextResult {
  const normalized = normalizeText(options.text);
  const lineHeightMultiple = options.lineHeightMultiple ?? DEFAULT_LINE_HEIGHT;
  const charWidthRatio = options.charWidthRatio ?? DEFAULT_CHAR_WIDTH_RATIO;

  if (!normalized) {
    return { text: "", fontSize: options.baseFontSize };
  }

  for (let fontSize = options.baseFontSize; fontSize >= options.minFontSize; fontSize -= 0.5) {
    const maxCharsPerLine = estimateMaxCharsPerLine(options.w, fontSize, charWidthRatio);
    const inferredMaxLines =
      options.maxLines ?? estimateMaxLines(options.h, fontSize, lineHeightMultiple);

    const lines = wrapTextToLines(normalized, maxCharsPerLine);
    if (lines.length <= inferredMaxLines) {
      return { text: lines.join("\n"), fontSize };
    }
  }

  const fontSize = options.minFontSize;
  const maxCharsPerLine = estimateMaxCharsPerLine(options.w, fontSize, charWidthRatio);
  const inferredMaxLines = options.maxLines ?? estimateMaxLines(options.h, fontSize, lineHeightMultiple);
  const lines = wrapTextToLines(normalized, maxCharsPerLine);
  const truncated = truncateToFit(lines, inferredMaxLines, maxCharsPerLine);
  return { text: truncated.join("\n"), fontSize };
}

