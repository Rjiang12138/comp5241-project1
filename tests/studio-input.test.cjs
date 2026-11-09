const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createLoader } = require("./load-ts.cjs");

const load = createLoader();
const policy = load("lib/studio-input.ts");
const source = load("lib/source.ts");
const { generateOutline } = load("lib/generate.ts");
const MiB = 1024 * 1024;
const brief = "Teach learners how to review software requirements and verify their assumptions.";

function textFile(text, name = "notes.txt") {
  return new File([text], name, { type: "text/plain" });
}

// A real one-page PDF with selectable text, or a valid blank page for the OCR case.
function pdfFile(lines, name = "lecture.pdf") {
  const stream = lines.length === 0 ? "" : `BT /F1 12 Tf 50 760 Td ${lines.map((line, i) => `${i ? "0 -20 Td " : ""}(${line.replace(/[()\\]/g, "\\$&")}) Tj`).join("\n")} ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let document = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, i) => {
    offsets.push(Buffer.byteLength(document));
    document += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(document);
  document += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  document += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  document += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new File([document], name, { type: "application/pdf" });
}

test("file type, count and exact size boundaries are enforced before reading", () => {
  assert.equal(policy.validateMaterials([{ name: "LECTURE.PDF", size: 12 * MiB }]), null);
  assert.match(policy.validateMaterials([{ name: "a.pdf", size: 12 * MiB + 1 }]), /12 MB/);
  assert.equal(policy.validateMaterials([{ name: "a.txt", size: 7 * MiB }, { name: "b.md", size: 7 * MiB }]), null);
  assert.match(policy.validateMaterials([{ name: "a.txt", size: 7 * MiB }, { name: "b.md", size: 7 * MiB + 1 }]), /14 MB/);
  assert.equal(policy.validateMaterials(Array.from({ length: 5 }, () => ({ name: "a.txt", size: 1 }))), null);
  assert.match(policy.validateMaterials(Array.from({ length: 6 }, () => ({ name: "a.txt", size: 1 }))), /5 source/);
  assert.match(policy.validateMaterials([{ name: "slides.pptx", size: 1 }]), /unsupported/);
  assert.match(policy.validateMaterials([{ name: "notes", size: 1 }]), /unsupported/);
  assert.match(policy.validateMaterials([{ name: "empty.txt", size: 0 }]), /empty/);
});

test("brief-only input has a meaningful minimum and bounded title/brief lengths", () => {
  assert.match(policy.validateStudioInput({ title: "", brief: " ", files: [] }), /20 characters/);
  assert.equal(policy.validateStudioInput({ title: "", brief: "a".repeat(20), files: [] }), null);
  assert.equal(policy.validateStudioInput({ title: "", brief: "", files: [{ name: "a.txt", size: 10 }] }), null);
  assert.match(policy.validateStudioInput({ title: "a".repeat(201), brief, files: [] }), /200/);
  assert.match(policy.validateStudioInput({ title: "", brief: "a".repeat(12001), files: [] }), /12,000/);
});

test("visual page selection is explicit, bounded and restricted to one PDF", () => {
  assert.deepEqual(policy.parseVisualPages(""), { pages: [], error: null });
  assert.deepEqual(policy.parseVisualPages("2, 5-7, 5"), { pages: [2, 5, 6, 7], error: null });
  for (const invalid of ["0", "101", "5-2", "1-5", "a", "2,", "1,2,3,4,5"]) {
    assert.ok(policy.parseVisualPages(invalid).error, invalid);
  }
  const files = [{ name: "one.pdf", size: 100 }, { name: "two.pdf", size: 100 }];
  assert.match(policy.validateStudioInput({ title: "", brief, files, includeVisuals: true }), /one PDF/);
  assert.equal(policy.validateStudioInput({ title: "", brief, files, includeVisuals: false }), null);
});

test("UTF-8 Markdown, TXT and CSV preserve teaching content including Unicode", async () => {
  for (const name of ["notes.md", "notes.TXT", "notes.csv"]) {
    const text = "主题,说明\n需求分析,先理解用户的真实需求。\n";
    const doc = await source.readSource(textFile(text, name));
    assert.equal(doc.text, text);
    assert.equal(doc.pages, 1);
  }
});

test("unreadable text errors name the file and distinguish encoding, binary and whitespace", async () => {
  await assert.rejects(source.readSource(new File([new Uint8Array([0xc3, 0x28])], "bad.txt")), /bad.txt.*UTF-8/);
  await assert.rejects(source.readSource(textFile("hello\u0000world", "binary.txt")), /binary.txt.*binary/);
  await assert.rejects(source.readSource(textFile(" \n\t", "blank.md")), /blank.md.*whitespace/);
  await assert.rejects(source.readSource(textFile("", "empty.txt")), /empty.txt.*empty/);
  await assert.rejects(source.readSource(textFile("not a deck", "deck.pptx")), /deck.pptx.*unsupported/);
});

test("selectable-text PDF extracts teaching text and page count", async () => {
  const doc = await source.readSource(pdfFile(["Requirements Engineering", "Validate the unique cobalt requirement before implementation."], "LECTURE.PDF"));
  assert.equal(doc.pages, 1);
  assert.match(doc.text, /unique cobalt requirement/);
});

test("blank and malformed PDFs produce specific safe errors", async () => {
  await assert.rejects(source.readSource(pdfFile([], "scan.pdf")), /scan.pdf.*no usable teaching text.*visual analysis/);
  await assert.rejects(source.readSource(textFile("this is text", "fake.pdf")), /fake.pdf.*not a valid PDF/);
  await assert.rejects(source.readSource(textFile("%PDF-1.4\nbroken", "broken.pdf")), /broken.pdf.*could not be parsed/);
});

test("short or unheaded uploaded teaching material is not replaced by the default brief", async () => {
  for (const [name, text] of [
    ["prose.txt", "the unique cobalt acceptance rule requires approval from two reviewers."],
    ["notes.md", "# Acceptance Rules\nThe unique cobalt acceptance rule requires two reviewers."],
    ["rules.csv", "topic,rule\ncobalt,require approval from two reviewers"],
    ["中文.txt", "钴蓝验收规则要求两名评审人员批准。"],
  ]) {
    const doc = await source.readSource(textFile(text, name));
    const outline = await generateOutline([doc], { title: "Material fidelity", audience: "non_cs", minutes: 45, brief, useModel: false });
    assert.ok(outline.modules.length > 0, name);
    const payloads = JSON.stringify(outline.modules.flatMap((module) => module.activities.map((activity) => activity.payload)));
    assert.match(payloads, /cobalt|钴蓝/, name);
    assert.doesNotMatch(outline.steps.find((step) => step.label === "Find section boundaries").detail, /drawn from the brief/, name);
  }
});

test("brief-only English and Chinese generate without any provider or database", async () => {
  for (const text of [brief, "请为没有编程基础的同学设计需求分析课程，解释如何确认用户需求。"] ) {
    const outline = await generateOutline([], { title: "Requirements", audience: "non_cs", minutes: 45, brief: text, useModel: false });
    assert.ok(outline.modules.length > 0);
    assert.equal(outline.model, "template-v1");
    assert.equal(outline.sources.length, 0);
  }
});

function actionHarness() {
  const calls = { generated: 0, saved: 0, parsed: 0 };
  const actionLoader = createLoader({
    "@/lib/auth": { requireStaff: async () => ({ userId: "test-instructor", role: "instructor" }) },
    "@/lib/generate": {
      readSource: async (file, options) => { calls.parsed += 1; return source.readSource(file, options); },
      generateOutline: async (docs, options) => { calls.generated += 1; return generateOutline(docs, { ...options, useModel: false }); },
    },
    "@/lib/source": source,
    "@/lib/store": { createCourseFromOutline: async () => { calls.saved += 1; return "test-course"; } },
    "next/cache": { revalidatePath() {} },
  });
  return { action: actionLoader("app/studio/actions.ts").generateCourseAction, calls };
}

function submission(files = [], text = brief) {
  const data = new FormData();
  data.set("title", "Requirements");
  data.set("brief", text);
  data.set("audience", "non_cs");
  data.set("minutes", "45");
  for (const file of files) data.append("material", file);
  return data;
}

test("unused browser picker placeholder permits brief-only generation", async () => {
  const placeholders = [textFile("", ""), new File([], "undefined", { type: "application/octet-stream" })];
  for (const placeholder of placeholders) {
    const { action, calls } = actionHarness();
    const result = await action({ status: "idle" }, submission([placeholder]));
    assert.equal(result.status, "ok");
    assert.equal(result.courseId, "test-course");
    assert.deepEqual(calls, { generated: 1, saved: 1, parsed: 0 });
  }
});

test("invalid metadata prevents all parsing, generation and saves", async () => {
  for (const files of [[textFile("", "empty.txt")], [textFile("content", "bad.pptx")]]) {
    const { action, calls } = actionHarness();
    const result = await action({ status: "idle" }, submission(files));
    assert.equal(result.status, "error");
    assert.deepEqual(calls, { generated: 0, saved: 0, parsed: 0 });
  }
  const { action, calls } = actionHarness();
  const result = await action({ status: "idle" }, submission([textFile("", "")], ""));
  assert.equal(result.status, "error");
  assert.deepEqual(calls, { generated: 0, saved: 0, parsed: 0 });
});

test("invalid visual page ranges stop the server action before parsing or provider use", async () => {
  const { action, calls } = actionHarness();
  const data = submission([pdfFile(["A valid teaching statement."])]);
  data.set("includeVisuals", "on");
  data.set("visualPages", "1-5");
  const result = await action({ status: "idle" }, data);
  assert.equal(result.status, "error");
  assert.match(result.message, /no more than 4 pages/);
  assert.deepEqual(calls, { generated: 0, saved: 0, parsed: 0 });
});

test("one unreadable upload fails the selection without generating a partial course", async () => {
  const { action, calls } = actionHarness();
  const result = await action({ status: "idle" }, submission([textFile("Cobalt requires two reviewers."), pdfFile([], "scan.pdf")]));
  assert.equal(result.status, "error");
  assert.match(result.message, /scan.pdf.*visual analysis.*No course was saved/);
  assert.deepEqual(calls, { generated: 0, saved: 0, parsed: 2 });
});

test("a normal PDF reaches the generation action and produces a saved draft", async () => {
  const { action, calls } = actionHarness();
  const result = await action({ status: "idle" }, submission([pdfFile(["Requirements Engineering", "The unique cobalt rule requires two reviewers."])], ""));
  assert.equal(result.status, "ok");
  assert.equal(result.outline.sources[0].pages, 1);
  assert.match(JSON.stringify(result.outline.modules), /cobalt/);
  assert.deepEqual(calls, { generated: 1, saved: 1, parsed: 1 });
});
