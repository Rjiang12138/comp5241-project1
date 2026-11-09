const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createLoader } = require("./load-ts.cjs");

const quality = createLoader()("lib/outline-quality.ts");
const brief = "Explain requirements, review acceptance criteria, and verify software changes.";
const options = { title: "Requirements", audience: "non_cs", minutes: 45, brief, useModel: true };

function modelDraft() {
  return { modules: ["Requirements", "Acceptance Criteria", "Verification"].map((title) => ({
    title, objective: `Explain ${title}.`, minutes: 14,
    activities: [
      { title: `Read ${title}`, format: "reading", minutes: 5 },
      { title: `Apply ${title}`, format: "simulation", minutes: 7 },
    ],
  })) };
}

function generator(value) {
  const load = createLoader({
    "./llm": { llmConfigured: () => true, completeJson: async () => value === null ? null : ({ value, model: "test-model", provider: "test", ms: 7 }) },
  });
  return load("lib/generate.ts").generateOutline;
}

function assertTiming(outline, target) {
  assert.equal(outline.modules.reduce((sum, module) => sum + module.estimatedMinutes, 0), target);
  for (const module of outline.modules) {
    assert.equal(module.activities.reduce((sum, activity) => sum + activity.minutes, 0), module.estimatedMinutes);
    assert.ok(module.activities.every((activity) => Number.isInteger(activity.minutes) && activity.minutes >= 2));
  }
  assert.equal(quality.checkOutline(outline.modules, target, outline.template, false), null);
}

test("valid model draft keeps its structure and exactly matches the requested time", async () => {
  const outline = await generator(modelDraft())([], options);
  assert.equal(outline.template, false);
  assert.equal(outline.model, "test-model");
  assertTiming(outline, 45);
  assert.match(outline.steps.find((step) => step.label === "Review source order").detail, /instructor review required/);
});

test("malformed model drafts are rejected with a visible reason and a valid template", async () => {
  const cases = [
    ["missing modules", {}, /3–7 modules/],
    ["too few modules", { modules: modelDraft().modules.slice(0, 2) }, /3–7 modules/],
    ["too many modules", { modules: Array(8).fill(modelDraft().modules[0]) }, /3–7 modules/],
    ["null module", { modules: [null, ...modelDraft().modules.slice(1)] }, /title and objective/],
    ["duplicate title", (() => { const d = modelDraft(); d.modules[1].title = d.modules[0].title; return d; })(), /distinct/],
    ["missing objective", (() => { const d = modelDraft(); d.modules[0].objective = " "; return d; })(), /title and objective/],
    ["null activity", (() => { const d = modelDraft(); d.modules[0].activities[0] = null; return d; })(), /activity.*title/],
    ["unknown format", (() => { const d = modelDraft(); d.modules[0].activities[1].format = "video"; return d; })(), /unsupported activity format/],
    ["no interactive activity", (() => { const d = modelDraft(); d.modules[0].activities.pop(); return d; })(), /interactive activity/],
    ["too many activities", (() => { const d = modelDraft(); d.modules[0].activities.push(...d.modules[0].activities); return d; })(), /1–3 activities/],
    ["invalid time", (() => { const d = modelDraft(); d.modules[0].minutes = -1; return d; })(), /invalid minutes/],
    ["implausible total", (() => { const d = modelDraft(); d.modules.forEach((m) => { m.minutes = 80; }); return d; })(), /too far/],
  ];
  for (const [label, value, reason] of cases) {
    const outline = await generator(value)([], options);
    assert.equal(outline.template, true, label);
    assert.match(outline.steps.find((step) => step.label === "Call language model").detail, reason, label);
    assert.match(outline.steps.find((step) => step.label === "Call language model").detail, /template/, label);
    assertTiming(outline, 45);
  }
});

test("the activity minimum rejects a model draft that cannot fit the target", async () => {
  const value = { modules: Array.from({ length: 7 }, (_, index) => ({
    title: `Topic ${index + 1}`, objective: "Apply the concept.", minutes: 3,
    activities: [
      { title: "Read", format: "reading", minutes: 1 },
      { title: "Practise", format: "simulation", minutes: 2 },
    ],
  })) };
  const outline = await generator(value)([], { ...options, minutes: 15 });
  assert.equal(outline.template, true);
  assert.match(outline.steps.find((step) => step.label === "Call language model").detail, /too many activities/);
  assertTiming(outline, 15);
});

test("template handles short, repeated and many headings without inventing duplicate modules", async () => {
  const generate = generator(null);
  const source = { name: "notes.md", pages: 1, text: "# Topic A\nFirst useful lesson.\n# Topic A\nA repeated heading.\n# Topic B\nSecond useful lesson." };
  for (const minutes of [15, 30, 45, 90, 120]) {
    const outline = await generate([source], { ...options, minutes, useModel: false });
    assert.equal(outline.modules.length, 2);
    assert.match(outline.steps.find((step) => step.label === "Draft module sequence").detail, /limited source sections/);
    assertTiming(outline, minutes);
  }
  const many = { name: "many.md", pages: 1, text: Array.from({ length: 20 }, (_, i) => `# Topic ${i + 1}\nA useful teaching statement.`).join("\n") };
  for (const minutes of [15, 30, 45, 90, 120]) {
    const outline = await generate([many], { ...options, minutes, useModel: false });
    assert.ok(outline.modules.length >= 3 && outline.modules.length <= 7);
    assertTiming(outline, minutes);
  }
});

test("minute allocation handles minimums and rounding without losing minutes", () => {
  assert.deepEqual(quality.allocateMinutes(15, [1, 1, 1], [4, 4, 4]), [5, 5, 5]);
  assert.deepEqual(quality.allocateMinutes(15, [100, 1, 1], [4, 4, 4]), [7, 4, 4]);
  assert.equal(quality.allocateMinutes(11, [1, 1, 1], [4, 4, 4]), null);
  for (let target = 15; target <= 120; target += 1) {
    for (let count = 1; count <= 7; count += 1) {
      const minima = Array.from({ length: count }, (_, index) => 2 + (index % 3));
      if (minima.reduce((a, b) => a + b, 0) > target) continue;
      const parts = quality.allocateMinutes(target, minima.map((_, index) => index + 0.1), minima);
      assert.equal(parts.reduce((a, b) => a + b, 0), target);
      assert.ok(parts.every((value, index) => Number.isInteger(value) && value >= minima[index]));
    }
  }
});

test("the server action refuses to save an invalid generated draft", async () => {
  let saves = 0;
  const badModules = [{ title: "Bad draft", objective: "Explain it", estimatedMinutes: 45,
    activities: [{ title: "Read", format: "reading", minutes: 45 }] }];
  const load = createLoader({
    "@/lib/auth": { requireStaff: async () => ({ userId: "teacher" }) },
    "@/lib/generate": { generateOutline: async () => ({ modules: badModules, template: true, model: "template-v1", steps: [], sources: [] }) },
    "@/lib/store": { createCourseFromOutline: async () => { saves += 1; return "unexpected"; } },
    "next/cache": { revalidatePath() {} },
  });
  const form = new FormData();
  form.set("title", "Requirements");
  form.set("brief", brief);
  form.set("minutes", "45");
  const result = await load("app/studio/actions.ts").generateCourseAction({ status: "idle" }, form);
  assert.equal(result.status, "error");
  assert.match(result.message, /interactive activity.*No course was saved/);
  assert.equal(saves, 0);
});
