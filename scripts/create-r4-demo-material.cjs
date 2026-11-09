const fs = require("node:fs/promises");
const path = require("node:path");
const { diagramPdf } = require("../tests/pdf-fixture.cjs");

(async () => {
  const file = diagramPdf({ name: "r4-demo-architecture.pdf" });
  const output = path.resolve(__dirname, "../.tmpcheck/r4-demo/r4-demo-architecture.pdf");
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, Buffer.from(await file.arrayBuffer()), { flag: "wx" });
  console.log(`Created synthetic demo PDF: ${output}`);
})().catch((error) => {
  if (error.code === "EEXIST") console.log("Demo PDF already exists; file not changed.");
  else { console.error(error.message); process.exitCode = 1; }
});
