// Minimal real PDF fixture with native selectable text; no invoice/customer data.
export function invoicePdf(lines?: string[]) {
  const text = lines
    ? "BT /F1 12 Tf 50 740 Td " + lines.map((line, index) => `${index ? "0 -18 Td " : ""}(${line.replace(/([\\()])/g, "\\$1")}) Tj`).join(" ") + " ET"
    : "BT /F1 12 Tf 50 740 Td (Invoice TEST-1 Supplier Example OU Amount due EUR 104.00 Due date 2030-10-20) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((o, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((n) => `${String(n).padStart(10, "0")} 00000 n \n`)
    .join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}
