export type PdfCell = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};
export type PdfLine = { page: number; y: number; cells: PdfCell[] };

export function orderPdfLines(items: PdfCell[], page: number): PdfLine[] {
  const rows: PdfLine[] = [];
  for (const item of [...items].sort((a, b) => a.y - b.y || a.x - b.x)) {
    if (!item.text.trim() || item.height < 3 || item.text.startsWith("DFC_"))
      continue;
    const row = rows.at(-1);
    if (row && Math.abs(row.y - item.y) <= Math.min(2.5, item.height * 0.25))
      row.cells.push({ ...item });
    else rows.push({ page, y: item.y, cells: [{ ...item }] });
  }
  for (const row of rows) {
    const cells: PdfCell[] = [];
    for (const cell of row.cells.sort((a, b) => a.x - b.x)) {
      const last = cells.at(-1);
      const gap = last ? cell.x - last.x - last.width : Infinity;
      if (last && gap >= -1 && gap <= Math.max(4, cell.height * 0.55)) {
        last.text +=
          (gap > cell.height * 0.15 &&
          !/\s$/.test(last.text) &&
          !/^\s/.test(cell.text)
            ? " "
            : "") + cell.text;
        last.width = cell.x + cell.width - last.x;
      } else cells.push({ ...cell });
    }
    row.cells = cells.map((cell) => ({ ...cell, text: cell.text.trim() }));
  }
  return rows;
}

/** Uses the PDF engine already bundled for previews. Never loads URLs or executes PDF scripts. */
export async function readPdfLayout(bytes: Buffer): Promise<PdfLine[]> {
  const pdf = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loading = pdf.getDocument({
    data: new Uint8Array(bytes),
    isEvalSupported: false,
    verbosity: 0,
  });
  try {
    const doc = await loading.promise;
    if (doc.numPages > 20)
      throw new Error("PDF exceeds local reading page limit");
    const lines: PdfLine[] = [];
    let length = 0;
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const items: PdfCell[] = [];
      for (const item of content.items) {
        if (!("str" in item)) continue;
        length += item.str.length;
        if (length > 100000)
          throw new Error("PDF exceeds local reading text limit");
        const transform = pdf.Util.transform(
          viewport.transform,
          item.transform,
        );
        items.push({
          text: item.str,
          x: transform[4],
          y: transform[5],
          width: item.width,
          height: Math.hypot(transform[2], transform[3]),
        });
      }
      lines.push(...orderPdfLines(items, n));
      page.cleanup();
    }
    return lines;
  } finally {
    await loading.destroy();
  }
}
