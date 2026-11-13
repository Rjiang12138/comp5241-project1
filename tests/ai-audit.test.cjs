const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createLoader } = require("./load-ts.cjs");
const { createHash } = require("node:crypto");

const baseLoad = createLoader();
const prompts = baseLoad("lib/prompts.ts");
const { auditAttempt } = baseLoad("lib/ai-audit.ts");
const options = { title: "Requirements", audience: "non_cs", minutes: 45,
  brief: "Explain the requirements. Review acceptance criteria. Verify software changes.", useModel: true };
const validModel = { modules: ["Requirements", "Acceptance", "Verification"].map((title) => ({
  title, objective: `Explain ${title}.`, minutes: 15,
  activities: [{ title: `Read ${title}`, format: "reading", minutes: 7 }, { title: `Apply ${title}`, format: "simulation", minutes: 8 }],
})) };

test("prompt versions identify fixed templates without storing supplied material", () => {
  assert.match(prompts.OUTLINE_PROMPT.version, /^outline-[a-f0-9]{20}$/);
  assert.match(prompts.VISION_PROMPT.version, /^vision-[a-f0-9]{20}$/);
  assert.equal(prompts.OUTLINE_PROMPT.version, `outline-${createHash("sha256").update(prompts.OUTLINE_PROMPT.template).digest("hex").slice(0, 20)}`);
  assert.notEqual(prompts.OUTLINE_PROMPT.version, prompts.VISION_PROMPT.version);
  const inserted = "private source {{minutes}}";
  const rendered = prompts.renderPrompt("Brief: {{brief}}, duration: {{minutes}}", { brief: inserted, minutes: "45" });
  assert.equal(rendered, "Brief: private source {{minutes}}, duration: 45");
  assert.ok(!prompts.OUTLINE_PROMPT.template.includes(inserted));
});

test("model usage is captured as returned and missing or malformed counts stay unknown", async () => {
  const keys = ["DEEPSEEK_API_KEY", "CHATANYWHERE_API_KEY", "OPENROUTER_API_KEY", "LLM_MIN_GAP_MS"];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const oldFetch = global.fetch;
  try {
    for (const key of keys) delete process.env[key];
    process.env.DEEPSEEK_API_KEY = "test-only-key";
    process.env.LLM_MIN_GAP_MS = "0";
    const responses = [
      { model: "actual-model", choices: [{ message: { content: '{"ok":true}' } }], usage: { prompt_tokens: 21, completion_tokens: 4 } },
      { choices: [{ message: { content: '{"ok":true}' } }], usage: { prompt_tokens: -1, completion_tokens: "4" } },
      { choices: [{ message: { content: "not json" } }], usage: { prompt_tokens: 3, completion_tokens: 2 } },
    ];
    global.fetch = async () => new Response(JSON.stringify(responses.shift()), { status: 200, headers: { "content-type": "application/json" } });
    const llm = createLoader()("lib/llm.ts");
    const attempts = [];
    const call = () => llm.completeJson({ system: "JSON", user: "Test", maxAttempts: 1, onAttempt: (value) => attempts.push(value) });
    const first = await call();
    assert.equal(first.model, "actual-model");
    assert.equal(first.tokensIn, 21);
    assert.equal(first.tokensOut, 4);
    const second = await call();
    assert.equal(second.tokensIn, null);
    assert.equal(second.tokensOut, null);
    assert.equal(await call(), null);
    assert.deepEqual(attempts.map(({ outcome, tokensIn, tokensOut }) => ({ outcome, tokensIn, tokensOut })), [
      { outcome: "response", tokensIn: 21, tokensOut: 4 },
      { outcome: "response", tokensIn: null, tokensOut: null },
      { outcome: "invalid_json", tokensIn: 3, tokensOut: 2 },
    ]);
    assert.ok(!JSON.stringify(attempts).includes("test-only-key"));
  } finally {
    global.fetch = oldFetch;
    for (const key of keys) previous[key] === undefined ? delete process.env[key] : process.env[key] = previous[key];
  }
});

test("rejected model results and the template fallback are separate auditable entries", async () => {
  const load = createLoader({ "./llm": { llmConfigured: () => true, completeJson: async ({ onAttempt }) => {
    onAttempt({ provider: "deepseek", model: "model-a", latencyMs: 80, tokensIn: 100, tokensOut: 30, outcome: "response", sent: true });
    return { value: { modules: [null] }, model: "model-a", provider: "deepseek", ms: 80, tokensIn: 100, tokensOut: 30 };
  } } });
  const outline = await load("lib/generate.ts").generateOutline([], options);
  assert.equal(outline.template, true);
  assert.deepEqual(outline.auditRuns.map(({ outcome }) => outcome), ["rejected", "template"]);
  assert.equal(outline.auditRuns[0].tokensIn, 100);
  assert.equal(outline.auditRuns[0].promptVersion, prompts.OUTLINE_PROMPT.version);
  assert.equal(outline.auditRuns[1].tokensIn, null);
  assert.equal(outline.auditRuns[1].provider, null);
});

test("PDF and outline model attempts carry separate versions and token usage", async () => {
  const mockLlm = { llmConfigured: () => true, llmVisionConfigured: () => true,
    completeJson: async ({ capability, onAttempt }) => {
      const visual = capability === "vision";
      onAttempt({ provider: "deepseek", model: visual ? "vision-model" : "text-model", latencyMs: 14,
        tokensIn: visual ? 200 : 100, tokensOut: visual ? 20 : 10, outcome: "response", sent: true });
      return { value: visual ? { pages: [{ page: 1, hasTeachingContent: true, observations: ["Client sends requests to API."], uncertainties: [] }] } : validModel,
        model: visual ? "vision-model" : "text-model", provider: "deepseek", ms: 14 };
    },
  };
  const load = createLoader({ "./llm": mockLlm, "./llm.ts": mockLlm });
  const result = await load("lib/pdf-vision.ts").summarizePdfPages([{ page: 1, dataUrl: "data:image/png;base64,YQ==" }], { fileName: "lecture.pdf" });
  assert.equal(result.ok, true);
  assert.equal(result.auditRuns[0].promptVersion, prompts.VISION_PROMPT.version);
  const outline = await load("lib/generate.ts").generateOutline([{ name: "lecture.pdf", pages: 1,
    text: "# Requirements\nUnderstand requirements.\n# Acceptance\nReview acceptance.\n# Verification\nVerify changes.",
    visual: { text: result.text, pages: result.pages, model: result.model, provider: result.provider, ms: result.ms, auditRuns: result.auditRuns } }], options);
  assert.equal(outline.template, false);
  assert.deepEqual(outline.auditRuns.map(({ purpose, tokensIn }) => [purpose, tokensIn]), [["vision", 200], ["outline", 100]]);
  assert.deepEqual(outline.auditRuns[0].metadata.pages, [1]);
  assert.equal(outline.auditRuns[1].promptVersion, prompts.OUTLINE_PROMPT.version);
  assert.ok(!JSON.stringify(outline.auditRuns).includes("data:image/"));
});

test("course creation stores prompt metadata and audit entries without inventing teacher acceptance", async () => {
  const saved = { prompts: [], course: null };
  const tx = { promptVersion: { upsert: async (args) => { saved.prompts.push(args); return { template: args.create.template }; } },
    course: { create: async (args) => { saved.course = args; return { id: "course-1" }; } } };
  const prisma = { $transaction: async (fn) => fn(tx) };
  const load = createLoader({ "./db": { prisma } });
  const run = auditAttempt("outline", prompts.OUTLINE_PROMPT.version,
    { provider: "deepseek", model: "m", latencyMs: 40, tokensIn: 10, tokensOut: null, outcome: "response", sent: true });
  const outline = { modules: [], steps: [], sources: [], template: false, model: "m", auditRuns: [run] };
  const id = await load("lib/store.ts").createCourseFromOutline({ title: "T", brief: "private source", audience: "mixed", minutes: 45, ownerId: "teacher", model: "m", outline });
  assert.equal(id, "course-1");
  assert.equal(saved.prompts.length, 1);
  assert.equal(saved.prompts[0].create.version, prompts.OUTLINE_PROMPT.version);
  assert.ok(!saved.prompts[0].create.template.includes("private source"));
  const storedRun = saved.course.data.aiRuns.create[0];
  assert.equal(storedRun.acceptedBy, null);
  assert.equal(storedRun.tokensIn, 10);
  assert.equal(storedRun.tokensOut, null);
  assert.equal(storedRun.costUsd, null);
  assert.equal(storedRun.outcome, "used");
});

test("publishing an AI-generated course requires an explicit review and records the teacher and version", async () => {
  const writes = [];
  const tx = {
    aiRun: { count: async () => 1 },
    course: { findUnique: async () => ({ title: "T", modules: [] }), update: async (args) => { writes.push(["course", args]); return { version: 2 }; } },
    courseVersion: { create: async (args) => { writes.push(["version", args]); return { id: "version-2" }; } },
    aiReview: { create: async (args) => { writes.push(["review", args]); } },
  };
  const store = createLoader({ "./db": { prisma: { $transaction: async (fn) => fn(tx) } } })("lib/store.ts");
  await assert.rejects(store.publishCourse("course-1", "teacher-1", false), /Review the generated course/);
  assert.equal(writes.length, 0);
  await store.publishCourse("course-1", "teacher-1", true);
  assert.deepEqual(writes.map(([name]) => name), ["course", "version", "review"]);
  assert.deepEqual(writes[2][1].data, { courseId: "course-1", courseVersionId: "version-2", reviewerId: "teacher-1" });
  assert.equal(writes[1][1].data.snapshot.title, "T");
});

test("publish action requires review before filling and asks for another review if content was added", async () => {
  const calls = [];
  let written = 1;
  const redirect = (url) => { throw Object.assign(new Error("redirect"), { url }); };
  const load = createLoader({
    "@/lib/auth": { requireStaff: async () => ({ userId: "teacher-1" }) },
    "@/lib/store": { courseAiAudit: async () => ({ runs: [{}] }),
      fillActivityContent: async () => { calls.push("fill"); return written; },
      publishCourse: async (...args) => { calls.push(args); } },
    "next/cache": { revalidatePath() {} }, "next/navigation": { redirect },
  });
  const publish = load("app/courses/actions.ts").publishCourseAction;
  const form = new FormData(); form.set("courseId", "course-1");
  await assert.rejects(publish(form), (error) => error.url === "/courses/course-1?review=required");
  assert.deepEqual(calls, []);
  form.set("confirmAiReview", "on");
  await assert.rejects(publish(form), (error) => error.url === "/courses/course-1?review=content-added&filled=1");
  assert.deepEqual(calls, ["fill"]);
  written = 0;
  await publish(form);
  assert.deepEqual(calls.at(-1), ["course-1", "teacher-1", true]);
});

test("an unusable visual response retains its model attempt and token counts", async () => {
  const mockLlm = { llmVisionConfigured: () => true, completeJson: async ({ onAttempt }) => {
    onAttempt({ provider: "deepseek", model: "vision-model", latencyMs: 55, tokensIn: 22, tokensOut: 6, outcome: "response", sent: true });
    return { value: { pages: [] }, provider: "deepseek", model: "vision-model", ms: 55 };
  } };
  const load = createLoader({ "./llm.ts": mockLlm });
  const result = await load("lib/pdf-vision.ts").summarizePdfPages([{ page: 1, dataUrl: "data:image/png;base64,YQ==" }], { fileName: "broken.pdf" });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "invalid_response");
  assert.equal(result.auditRuns[0].outcome, "rejected");
  assert.equal(result.auditRuns[0].tokensIn, 22);
  assert.equal(result.auditRuns[0].metadata.reason, "invalid_vision_response");
});

test("failed attempts are stored against the teacher without a fabricated course or approval", async () => {
  const saved = { prompts: [], rows: [] };
  const tx = { promptVersion: { upsert: async (args) => { saved.prompts.push(args); return { template: args.create.template }; } },
    aiRun: { createMany: async ({ data }) => { saved.rows = data; } } };
  const store = createLoader({ "./db": { prisma: { $transaction: async (fn) => fn(tx) } } })("lib/store.ts");
  const run = { purpose: "vision", promptVersion: prompts.VISION_PROMPT.version, model: "m", provider: "deepseek",
    outcome: "rejected", tokensIn: 22, tokensOut: null, latencyMs: 55 };
  await store.recordUnattachedAiRuns("teacher-1", [run]);
  assert.equal(saved.prompts[0].create.version, prompts.VISION_PROMPT.version);
  assert.equal(saved.rows[0].actorId, "teacher-1");
  assert.equal(saved.rows[0].courseId, null);
  assert.equal(saved.rows[0].acceptedBy, null);
  assert.equal(saved.rows[0].costUsd, null);
  assert.equal(saved.rows[0].tokensIn, 22);
  assert.equal(saved.rows[0].tokensOut, null);
  assert.equal(saved.rows[0].metadata.sequence, 0);
});

test("a conflicting stored prompt version aborts the draft write", async () => {
  let saved = false;
  const tx = { promptVersion: { upsert: async () => ({ template: "different template" }) },
    course: { create: async () => { saved = true; return { id: "unexpected" }; } } };
  const store = createLoader({ "./db": { prisma: { $transaction: async (fn) => fn(tx) } } })("lib/store.ts");
  const run = { purpose: "outline", promptVersion: prompts.OUTLINE_PROMPT.version, model: "m", provider: "deepseek",
    outcome: "used", tokensIn: 1, tokensOut: 1, latencyMs: 1 };
  const outline = { modules: [], steps: [], sources: [], template: false, model: "m", auditRuns: [run] };
  await assert.rejects(store.createCourseFromOutline({ title: "T", brief: "", audience: "mixed", minutes: 45,
    ownerId: "teacher", model: "m", outline }), /does not match its version fingerprint/);
  assert.equal(saved, false);
});

test("a course audit preserves attempt order when database timestamps match", async () => {
  const time = new Date("2026-11-10T00:00:00Z");
  const rows = [{ id: "outline", createdAt: time, metadata: { sequence: 1 } }, { id: "vision", createdAt: time, metadata: { sequence: 0 } }];
  const prisma = { aiRun: { findMany: async () => rows }, aiReview: { findMany: async () => [] } };
  const audit = await createLoader({ "./db": { prisma } })("lib/store.ts").courseAiAudit("course-1");
  assert.deepEqual(audit.runs.map((run) => run.id), ["vision", "outline"]);
});

test("material failure records already-incurred attempts and warns when the record cannot be saved", async () => {
  const { SourceReadError } = baseLoad("lib/source.ts");
  const attempts = [{ purpose: "vision", promptVersion: prompts.VISION_PROMPT.version, model: "m", provider: "deepseek",
    outcome: "used", tokensIn: 22, tokensOut: 6, latencyMs: 55 }];
  let failStorage = false;
  const saved = [];
  const load = createLoader({ "@/lib/auth": { requireStaff: async () => ({ userId: "teacher-1" }) },
    "@/lib/source": { SourceReadError },
    "@/lib/generate": { readSource: async () => { throw new SourceReadError("test.pdf: unreadable diagram.", attempts); } },
    "@/lib/store": { recordUnattachedAiRuns: async (actorId, runs) => { if (failStorage) throw new Error("db unavailable"); saved.push({ actorId, runs }); } },
    "next/cache": { revalidatePath() {} },
  });
  const action = load("app/studio/actions.ts").generateCourseAction;
  const form = new FormData();
  form.set("title", "Test"); form.append("material", new File(["test"], "test.pdf"));
  const first = await action({ status: "idle" }, form);
  assert.equal(first.status, "error");
  assert.match(first.message, /No course was saved/);
  assert.equal(saved[0].actorId, "teacher-1");
  assert.equal(saved[0].runs[0].outcome, "rejected");
  assert.equal(saved[0].runs[0].tokensIn, 22);
  assert.equal(attempts[0].outcome, "used", "do not mutate the original attempt");
  failStorage = true;
  const second = await action({ status: "idle" }, form);
  assert.match(second.message, /AI attempt record could not be saved/);
});

test("the course editor shows recorded usage and an explicit review control", async () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const run = { id: "run-1", purpose: "vision", outcome: "used", provider: "deepseek", model: "model-v",
    promptVersion: "vision-test", latencyMs: 1500, tokensIn: 22, tokensOut: null,
    metadata: { fileName: "lecture.pdf", pages: [2] } };
  const course = { id: "c1", title: "Course", code: "C", term: "T", minutes: 45, version: 1,
    status: "draft", audience: "mixed", brief: "", ownerId: "teacher-1",
    modules: [], learners: [], versions: [], cohort: null };
  const load = createLoader({
    "next/link": ({ href, children }) => React.createElement("a", { href }, children),
    // The editor sends a non-owner to /courses?denied=owner, so `redirect` has
    // to exist here. It throws rather than returning: if the fixture ever drifts
    // out of the owner's hands again, the failure should name the redirect that
    // was taken, not "redirect is not a function".
    "next/navigation": {
      notFound: () => { throw new Error("not found"); },
      redirect: (url) => { throw new Error(`redirected to ${url}`); },
    },
    "@/components/AutoSubmitInput": { __esModule: true, default: () => null, AutoSubmitSelect: () => null },
    "@/components/Shell": { Shell: ({ children, actions }) => React.createElement("main", null, actions, children) },
    "@/lib/auth": { requireStaff: async () => ({ userId: "teacher-1", name: "Teacher", role: "instructor" }) },
    "@/lib/store": { getCourse: async () => course, courseMinutes: async () => 0,
      courseAnalytics: async () => ({ learners: 0, activeThisWeek: 0, averageProgress: 0, finishedAll: 0, nudge: [], insight: null }),
      learnerProgress: async () => [], courseAiAudit: async () => ({ runs: [run], reviews: [] }) },
    "../actions": Object.fromEntries(["addActivityAction", "addModuleAction", "fillContentAction", "importRosterAction", "moveModuleAction", "publishCourseAction", "removeActivityAction", "removeModuleAction", "renameModuleAction", "saveCourseAction", "updateActivityAction"].map((name) => [name, async () => {}])),
  });
  const page = await load("app/courses/[id]/page.tsx").default({ params: Promise.resolve({ id: "c1" }), searchParams: Promise.resolve({}) });
  const html = renderToStaticMarkup(page).replace(/<!-- -->/g, "");
  assert.match(html, /name="confirmAiReview"/);
  assert.match(html, /No teacher review confirmation has been recorded/);
  assert.match(html, /PDF visual analysis/);
  assert.match(html, /input tokens 22/);
  assert.match(html, /output tokens unknown/);
  assert.match(html, /lecture\.pdf/);
  assert.match(html, /PDF pages 2/);
});
