const { createCanvas } = require("@napi-rs/canvas");

function escapePdfText(value) {
  return value.replace(/[()\\]/g, "\\$&");
}

// Build real PDF objects and byte offsets so parser/render tests exercise pdf.js.
function buildPdf(pageDefinitions, name) {
  const objects = [];
  const reserve = () => { objects.push(null); return objects.length; };
  const catalog = reserve();
  const pages = reserve();
  const font = reserve();
  objects[font - 1] = Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds = [];
  for (const definition of pageDefinitions) {
    const page = reserve();
    const content = reserve();
    pageIds.push(page);
    const stream = Buffer.from(definition.stream);
    objects[content - 1] = Buffer.concat([
      Buffer.from(`<< /Length ${stream.length} >>\nstream\n`), stream, Buffer.from("\nendstream"),
    ]);
    let imageResource = "";
    if (definition.image) {
      const image = reserve();
      const { width, height, bytes } = definition.image;
      objects[image - 1] = Buffer.concat([
        Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`),
        bytes, Buffer.from("\nendstream"),
      ]);
      imageResource = `/XObject << /Im1 ${image} 0 R >>`;
    }
    objects[page - 1] = Buffer.from(
      `<< /Type /Page /Parent ${pages} 0 R /MediaBox [0 0 ${definition.width} ${definition.height}] ` +
      `/Resources << /Font << /F1 ${font} 0 R >> ${imageResource} >> /Contents ${content} 0 R >>`,
    );
  }
  objects[catalog - 1] = Buffer.from(`<< /Type /Catalog /Pages ${pages} 0 R >>`);
  objects[pages - 1] = Buffer.from(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);
  const parts = [Buffer.from("%PDF-1.4\n")];
  const offsets = [0];
  let length = parts[0].length;
  objects.forEach((object, index) => {
    offsets.push(length);
    const part = Buffer.concat([Buffer.from(`${index + 1} 0 obj\n`), object, Buffer.from("\nendobj\n")]);
    parts.push(part);
    length += part.length;
  });
  const xref = length;
  parts.push(Buffer.from(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("") +
    `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`));
  return new File([Buffer.concat(parts)], name, { type: "application/pdf" });
}

function pdfFile(lines, name = "lecture.pdf", options = {}) {
  const stream = lines.length === 0 ? "" : `BT /F1 12 Tf 50 760 Td ${lines.map((line, index) => `${index ? "0 -20 Td " : ""}(${escapePdfText(line)}) Tj`).join("\n")} ET`;
  return buildPdf(Array.from({ length: options.pageCount ?? 1 }, () => ({ width: 612, height: 792, stream })), name);
}

function diagramPdf(options = {}) {
  const stream = [
    "0.12 0.25 0.45 RG 5 w",
    "150 480 380 240 re S 710 480 380 240 re S 1270 480 380 240 re S",
    "530 600 m 710 600 l S 680 620 m 710 600 l 680 580 l S",
    "1090 600 m 1270 600 l S 1240 620 m 1270 600 l 1240 580 l S",
    "BT /F1 48 Tf 260 580 Td (Client) Tj ET",
    "BT /F1 48 Tf 850 580 Td (API) Tj ET",
    "BT /F1 48 Tf 1350 580 Td (Database) Tj ET",
  ].join("\n");
  return buildPdf(Array.from({ length: options.pageCount ?? 1 }, () => ({ width: 1800, height: 1200, stream })), options.name ?? "architecture-diagram.pdf");
}

function bitmapDiagramPdf(options = {}) {
  const canvas = createCanvas(1200, 800);
  const context = canvas.getContext("2d");
  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#203e6a";
  context.fillStyle = "#203e6a";
  context.lineWidth = 4;
  context.font = "36px sans-serif";
  for (const [index, label] of ["Client", "API", "Database"].entries()) {
    const x = 80 + index * 380;
    context.strokeRect(x, 300, 280, 150);
    context.fillText(label, x + 30, 385);
    if (index < 2) {
      context.beginPath();
      context.moveTo(x + 280, 375);
      context.lineTo(x + 380, 375);
      context.lineTo(x + 360, 360);
      context.moveTo(x + 380, 375);
      context.lineTo(x + 360, 390);
      context.stroke();
    }
  }
  const image = { width: canvas.width, height: canvas.height, bytes: canvas.toBuffer("image/jpeg") };
  return buildPdf(Array.from({ length: options.pageCount ?? 1 }, () => ({
    width: 1800, height: 1200, stream: "q 1800 0 0 1200 0 0 cm /Im1 Do Q", image,
  })), options.name ?? "scanned-architecture.pdf");
}

module.exports = { pdfFile, diagramPdf, bitmapDiagramPdf };
