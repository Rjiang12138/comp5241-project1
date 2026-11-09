const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { createLoader } = require("./load-ts.cjs");
const { pdfFile, diagramPdf, bitmapDiagramPdf } = require("./pdf-fixture.cjs");

// This suite must never contact a paid provider, even if the shell has keys.
const originalFetch = global.fetch;
global.fetch = async () => { throw new Error("Network is disabled in PDF vision tests"); };
after(() => { global.fetch = originalFetch; });
const IMAGE = "data:image/png;base64,iVBORw0KGgo=";
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function sourceHarness(configured = true, hasTeachingContent = true) {
  const calls = [];
  const load = createLoader({
    "./llm.ts": { llmVisionConfigured: () => configured },
    "./pdf-vision.ts": {
      summarizePdfPages: async (images, options) => {
        calls.push({ images, options });
        return {
          ok: true,
          hasTeachingContent,
          text: images.map(({ page }) => `## PDF page ${page}: AI visual observations (teacher review required)\nObserved: Client sends a request to API; API accesses Database.\nUncertain: Arrow labels are not visible.`).join("\n\n"),
          pages: images.map(({ page }) => page), model: "mock-vision", provider: "deepseek", ms: 5,
        };
      },
    },
  });
  return { readSource: load("lib/source.ts").readSource, calls };
}

test("real vector PDF graphics are detected and rendered as full bounded PNG pages", async () => {
  const { readSource, calls } = sourceHarness();
  const source = await readSource(diagramPdf(), { includeVisuals: true });
  assert.match(source.text, /Client/);
  assert.deepEqual(source.visual.pages, [1]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.timeoutMs, 25_000);
  const { dataUrl, page } = calls[0].images[0];
  assert.equal(page, 1);
  assert.ok(dataUrl.startsWith("data:image/png;base64,"));
  const png = Buffer.from(dataUrl.split(",")[1], "base64");
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  assert.ok(width > 0 && height > 0 && Math.max(width, height) <= 1400);
  assert.ok(Math.abs(width / height - 1.5) < 0.01, "the render must preserve the complete page aspect ratio");
  assert.match(source.visual.text, /PDF page 1.*teacher review required/);
});

test("a real raster-only diagram works through vision without inventing selectable text", async () => {
  const { readSource, calls } = sourceHarness();
  const source = await readSource(bitmapDiagramPdf(), { includeVisuals: true });
  assert.equal(source.text.trim(), "");
  assert.deepEqual(source.visual.pages, [1]);
  assert.match(source.visual.text, /Client.*API.*Database/);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].images[0].dataUrl.startsWith("data:image/png;base64,"));
  const textOnly = sourceHarness();
  await assert.rejects(textOnly.readSource(bitmapDiagramPdf()), /no usable teaching text.*visual analysis/);
  assert.equal(textOnly.calls.length, 0);
});

test("a raster page reported as blank or decorative cannot become a course source", async () => {
  const { readSource, calls } = sourceHarness(true, false);
  await assert.rejects(readSource(bitmapDiagramPdf(), { includeVisuals: true }), /blank|no usable teaching|no.*teaching content/i);
  assert.equal(calls.length, 1, "a raster-only page needs the vision result to determine whether teaching content is present");
});

test("a completely blank PDF is rejected before a manual selection can call the model", async () => {
  for (const visualPages of [undefined, [1]]) {
    const { readSource, calls } = sourceHarness();
    await assert.rejects(readSource(pdfFile([], "blank.pdf"), { includeVisuals: true, visualPages }), /blank|no usable teaching/i);
    assert.equal(calls.length, 0);
  }
});

test("visual analysis is opt-in, text-only mode warns, and missing vision configuration is explicit", async () => {
  const { readSource, calls } = sourceHarness(false);
  const source = await readSource(diagramPdf());
  assert.match(source.text, /Client/);
  assert.equal(source.visual, undefined);
  assert.match(source.warnings.join(" "), /selectable text only.*not analyzed/);
  await assert.rejects(readSource(diagramPdf(), { includeVisuals: true }), /needs a configured vision model/);
  assert.equal(calls.length, 0);
  const plain = await readSource(pdfFile(["A selectable sentence without diagrams."]), { includeVisuals: true });
  assert.equal(plain.visual, undefined);
  assert.equal(calls.length, 0);
});

test("manual page selections are one-based, bounded by the PDF and the shared visual budget", async () => {
  for (const pages of [[0], [3], [1.5], [NaN]]) {
    const { readSource, calls } = sourceHarness();
    await assert.rejects(readSource(diagramPdf({ pageCount: 2 }), { includeVisuals: true, visualPages: pages }), /whole numbers from 1 to 2/);
    assert.equal(calls.length, 0);
  }
  const limited = sourceHarness();
  await assert.rejects(limited.readSource(diagramPdf({ pageCount: 2 }), { includeVisuals: true, maxVisualPages: 1 }), /only 1 visual pages remain/);
  assert.equal(limited.calls.length, 0);
  const invalidBudget = sourceHarness();
  await assert.rejects(invalidBudget.readSource(diagramPdf(), { includeVisuals: true, maxVisualPages: NaN }), /page budget is invalid/);
  assert.equal(invalidBudget.calls.length, 0);
});

test("too many detected graphics require an explicit smaller selection and report omitted pages", async () => {
  const { readSource, calls } = sourceHarness();
  await assert.rejects(readSource(diagramPdf({ pageCount: 5 }), { includeVisuals: true }), /5 pages contain graphics.*only 4 visual pages remain/);
  assert.equal(calls.length, 0);
  const source = await readSource(diagramPdf({ pageCount: 5 }), { includeVisuals: true, visualPages: [4, 2] });
  assert.deepEqual(source.visual.pages, [2, 4]);
  assert.deepEqual(calls[0].images.map(({ page }) => page), [2, 4]);
  assert.match(source.warnings.join(" "), /selected pages 2, 4.*3 other page/);
  const oversized = sourceHarness();
  await assert.rejects(oversized.readSource(pdfFile(["Selectable text."], "large.pdf", { pageCount: 101 })), /limited to 100 pages/);
  assert.equal(oversized.calls.length, 0);
});

test("manual ranges reject malformed, reversed, excessive and out-of-policy page numbers", () => {
  const { parseVisualPages } = createLoader()("lib/studio-input.ts");
  assert.deepEqual(parseVisualPages(""), { pages: [], error: null });
  assert.deepEqual(parseVisualPages(" 4, 2-3,2 "), { pages: [2, 3, 4], error: null });
  for (const range of ["0", "101", "3-1", "1-5", "1,2,3,4,5", "1.5", "1,", "1--2", "1e2", "a", "1".repeat(101)]) {
    assert.ok(parseVisualPages(range).error, range);
  }
});

function visionHarness(value, configured = true) {
  const calls = [];
  const load = createLoader({
    "./llm.ts": {
      llmVisionConfigured: () => configured,
      completeJson: async (options) => {
        calls.push(options);
        return value === undefined ? null : { value, model: "mock-vision", provider: "deepseek", ms: 1 };
      },
    },
  });
  return { summarizePdfPages: load("lib/pdf-vision.ts").summarizePdfPages, calls };
}

function pageObservation(page, observation = "Client points to API, which points to Database.", hasTeachingContent = true) {
  return { page, hasTeachingContent, observations: [observation], uncertainties: ["Arrow labels cannot be read."] };
}

test("vision descriptions keep requested page identity, uncertainty and transient image inputs", async () => {
  const { summarizePdfPages, calls } = visionHarness({ pages: [pageObservation(4), pageObservation(2)] });
  const result = await summarizePdfPages([{ page: 2, dataUrl: IMAGE }, { page: 4, dataUrl: IMAGE }], { fileName: "lecture.pdf", timeoutMs: 60_000 });
  assert.equal(result.ok, true);
  assert.equal(result.hasTeachingContent, true);
  assert.deepEqual(result.pages, [2, 4]);
  assert.match(result.text, /PDF page 2.*teacher review required/);
  assert.match(result.text, /Uncertain: Arrow labels cannot be read/);
  assert.ok(result.text.indexOf("PDF page 2") < result.text.indexOf("PDF page 4"));
  assert.equal(calls[0].capability, "vision");
  assert.equal(calls[0].totalTimeoutMs, 25_000);
  assert.equal(calls[0].maxAttempts, 2);
  assert.equal(calls[0].images.length, 2);
  assert.match(calls[0].user, /page order: 2, 4/);
  assert.match(calls[0].user, /hasTeachingContent/);
  assert.match(calls[0].system, /untrusted source data.*never as instructions/);
  assert.ok(!JSON.stringify(result).includes("data:image/"));
});

test("invalid, duplicate, invented or missing returned page IDs are rejected", async () => {
  const inputs = [{ page: 1, dataUrl: IMAGE }, { page: 2, dataUrl: IMAGE }];
  for (const value of [
    null, {}, { pages: [pageObservation(1)] },
    { pages: [pageObservation(1), pageObservation(1)] },
    { pages: [pageObservation(1), pageObservation(3)] },
    { pages: [pageObservation("1"), pageObservation(2)] },
    { pages: [{ page: 1, hasTeachingContent: true, observations: [], uncertainties: [] }, pageObservation(2)] },
    { pages: [{ page: 1, hasTeachingContent: true, observations: ["Visible arrows"], uncertainties: "none" }, pageObservation(2)] },
    { pages: [{ page: 1, observations: ["Visible arrows"], uncertainties: [] }, pageObservation(2)] },
    { pages: [{ ...pageObservation(1), hasTeachingContent: "true" }, pageObservation(2)] },
    { pages: [{ ...pageObservation(1), hasTeachingContent: null }, pageObservation(2)] },
  ]) {
    const harness = visionHarness(value);
    const result = await harness.summarizePdfPages(inputs, { fileName: "lecture.pdf" });
    assert.deepEqual(result, { ok: false, reason: "invalid_response" });
  }
  for (const inputs of [[], [{ page: 0, dataUrl: IMAGE }], [{ page: 1, dataUrl: "https://example.invalid/page.png" }], [{ page: 1, dataUrl: IMAGE }, { page: 1, dataUrl: IMAGE }]]) {
    const harness = visionHarness({ pages: [pageObservation(1)] });
    assert.deepEqual(await harness.summarizePdfPages(inputs, { fileName: "lecture.pdf" }), { ok: false, reason: "invalid_response" });
    assert.equal(harness.calls.length, 0);
  }
  const unconfigured = visionHarness(undefined, false);
  assert.deepEqual(await unconfigured.summarizePdfPages([{ page: 1, dataUrl: IMAGE }], { fileName: "lecture.pdf" }), { ok: false, reason: "not_configured" });
  assert.equal(unconfigured.calls.length, 0);
});

test("vision teaching-content flags aggregate explicitly rather than treating every observation as content", async () => {
  const inputs = [{ page: 1, dataUrl: IMAGE }, { page: 2, dataUrl: IMAGE }];
  for (const flags of [[false, false], [false, true], [true, false]]) {
    const { summarizePdfPages } = visionHarness({ pages: flags.map((flag, index) => pageObservation(index + 1, flag ? "Client calls API through a directed arrow." : "Only a blank background and a decorative border are visible.", flag)) });
    const result = await summarizePdfPages(inputs, { fileName: "lecture.pdf" });
    assert.equal(result.ok, true);
    assert.equal(result.hasTeachingContent, flags.some(Boolean));
  }
});

test("visual observations and page references survive both template seeds and the outline prompt", async () => {
  const prompts = [];
  const load = createLoader({
    "./llm": { llmConfigured: () => true, completeJson: async (options) => { prompts.push(options); return null; } },
  });
  const { generateOutline } = load("lib/generate.ts");
  const visualText = "## PDF page 2: AI visual observations (teacher review required)\nObserved: Client sends a cobalt request to API.\nObserved: API accesses Database through the right arrow.\nUncertain: The lower arrow label is unreadable.";
  const file = {
    name: "architecture.pdf", pages: 2,
    text: "# Original Request\nThe original amber requirement must be checked.\n# Data Access\nDatabase access requires authorization.\n# Review Evidence\nReviewers must verify the request sequence.",
    visual: { text: visualText, pages: [2], model: "mock-vision", provider: "deepseek", ms: 12 },
  };
  for (const useModel of [false, true]) {
    const outline = await generateOutline([file], { title: "Architecture", audience: "non_cs", minutes: 45, brief: "Do not replace source material.", useModel });
    const bodies = JSON.stringify(outline.modules.flatMap((module) => module.activities.map(({ payload }) => payload)));
    assert.match(bodies, /cobalt/);
    assert.match(bodies, /PDF page 2/);
    assert.match(bodies, /teacher review required/);
    assert.match(bodies, /Uncertain: The lower arrow label is unreadable/);
    assert.match(bodies, /amber requirement/);
    assert.deepEqual(outline.sources[0].visualPages, [2]);
    assert.ok(!JSON.stringify(outline).includes("data:image/"));
  }
  assert.equal(prompts.length, 1);
  assert.ok(prompts[0].user.includes(visualText));
  assert.match(prompts[0].user, /interpretations, not verified facts/);
});

test("a successful semantic model outline retains full attributed visual evidence in its reading payload", async () => {
  const calls = [];
  const value = {
    modules: ["Tracing Requests", "Protecting Persistence", "Checking Outcomes"].map((title) => ({
      title, objective: `Explain ${title.toLowerCase()}.`, minutes: 15,
      activities: [
        { title: `Read ${title}`, format: "reading", minutes: 7 },
        { title: `Apply ${title}`, format: "simulation", minutes: 8 },
      ],
    })),
  };
  const load = createLoader({
    "./llm": {
      llmConfigured: () => true,
      completeJson: async (options) => {
        calls.push(options);
        return { value, model: "mock-semantic-outline", provider: "deepseek", ms: 4 };
      },
    },
  });
  const visualText = "## PDF page 2: AI visual observations (teacher review required)\nObserved: The lilac transaction guard connects the API to the Database.\nUncertain: The lower return-arrow label is unreadable.";
  const outline = await load("lib/generate.ts").generateOutline([{
    name: "semantic-architecture.pdf", pages: 2,
    text: "# First Source\nVerify the first requirement.\n# Second Source\nVerify the second requirement.\n# Third Source\nVerify the third requirement.",
    visual: { text: visualText, pages: [2], model: "mock-vision", provider: "deepseek", ms: 3 },
  }], { title: "Request Handling", audience: "non_cs", minutes: 45, useModel: true });
  assert.equal(calls.length, 1);
  assert.equal(outline.template, false);
  assert.equal(outline.model, "mock-semantic-outline");
  assert.deepEqual(outline.modules.map(({ title }) => title), value.modules.map(({ title }) => title));
  const readings = outline.modules.flatMap(({ activities }) => activities.filter(({ format }) => format === "reading"));
  const payloads = JSON.stringify(readings.map(({ payload }) => payload));
  assert.match(payloads, /lilac transaction guard/);
  assert.match(payloads, /semantic-architecture\.pdf/);
  assert.match(payloads, /PDF page 2/);
  assert.match(payloads, /teacher review required/);
  assert.match(payloads, /Uncertain: The lower return-arrow label is unreadable/);
  assert.equal(outline.modules.reduce((sum, { activities }) => sum + activities.length, 0), 6, "attribution must not add a timed activity");
  assert.equal(outline.modules.reduce((sum, { estimatedMinutes }) => sum + estimatedMinutes, 0), 45);
});

test("a visual outline without any reading activity falls back to a template that can retain visual evidence", async () => {
  const load = createLoader({
    "./llm": {
      llmConfigured: () => true,
      completeJson: async () => ({
        value: { modules: ["Tracing Requests", "Protecting Persistence", "Checking Outcomes"].map((title) => ({
          title, objective: `Explain ${title.toLowerCase()}.`, minutes: 15,
          activities: [{ title: `Apply ${title}`, format: "simulation", minutes: 15 }],
        })) },
        model: "mock-no-reading", provider: "deepseek", ms: 4,
      }),
    },
  });
  const outline = await load("lib/generate.ts").generateOutline([{
    name: "no-reading.pdf", pages: 1,
    text: "# First Source\nVerify one condition.\n# Second Source\nVerify another condition.\n# Third Source\nCheck the result.",
    visual: { text: "## PDF page 1: AI visual observations (teacher review required)\nObserved: The lilac transaction guard connects API to Database.\nUncertain: The arrow label is unreadable.", pages: [1], model: "mock-vision", provider: "deepseek", ms: 3 },
  }], { title: "Requests", audience: "non_cs", minutes: 45, useModel: true });
  assert.equal(outline.template, true);
  const payloads = JSON.stringify(outline.modules.flatMap(({ activities }) => activities.filter(({ format }) => format === "reading").map(({ payload }) => payload)));
  assert.match(payloads, /lilac transaction guard/);
  assert.match(payloads, /no-reading\.pdf/);
  assert.match(payloads, /PDF page 1/);
  assert.match(payloads, /Uncertain: The arrow label is unreadable/);
});

const PROVIDER_ENV = [
  "DEEPSEEK_API_KEY", "DEEPSEEK_BASE_URL", "DEEPSEEK_MODEL", "DEEPSEEK_VISION_MODEL",
  "CHATANYWHERE_API_KEY", "CHATANYWHERE_BASE_URL", "CHATANYWHERE_MODEL", "CHATANYWHERE_VISION_MODEL",
  "OPENROUTER_API_KEY", "OPENROUTER_MODEL", "OPENROUTER_VISION_MODEL", "LLM_MIN_GAP_MS",
];

async function withProviders(values, fetchMock, callback) {
  const previous = Object.fromEntries(PROVIDER_ENV.map((key) => [key, process.env[key]]));
  const blockedFetch = global.fetch;
  try {
    for (const key of PROVIDER_ENV) delete process.env[key];
    Object.assign(process.env, { LLM_MIN_GAP_MS: "0", ...values });
    global.fetch = fetchMock;
    await callback(createLoader()("lib/llm.ts"));
  } finally {
    global.fetch = blockedFetch;
    for (const key of PROVIDER_ENV) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

function completionResponse(value = { checked: true }) {
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(value) } }] }), { status: 200, headers: { "Content-Type": "application/json" } });
}

test("DeepSeek vision sends image_url parts with the vision model, disabled thinking and JSON output", async () => {
  const calls = [];
  await withProviders({ DEEPSEEK_API_KEY: "fake-test-key", DEEPSEEK_MODEL: "text-only-model", DEEPSEEK_VISION_MODEL: "image-model" }, async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body) });
    return completionResponse();
  }, async (llm) => {
    const result = await llm.completeJson({ system: "Return JSON.", user: "Read page 2.", capability: "vision", images: [{ dataUrl: IMAGE }], totalTimeoutMs: 1000 });
    assert.equal(result.provider, "deepseek");
    assert.equal(result.model, "image-model");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://api.deepseek.com/chat/completions");
    assert.equal(calls[0].options.headers.Authorization, "Bearer fake-test-key");
    assert.deepEqual(calls[0].body.thinking, { type: "disabled" });
    assert.deepEqual(calls[0].body.response_format, { type: "json_object" });
    assert.deepEqual(calls[0].body.messages[1].content, [
      { type: "text", text: "Read page 2." },
      { type: "image_url", image_url: { url: IMAGE, detail: "high" } },
    ]);
  });
});

test("OpenRouter text-model pins are excluded from vision unless a separate vision model is configured", async () => {
  const calls = [];
  const mock = async (url, options) => { calls.push(JSON.parse(options.body)); return completionResponse(); };
  await withProviders({ OPENROUTER_API_KEY: "fake-test-key", OPENROUTER_MODEL: "text-model" }, mock, async (llm) => {
    assert.equal(llm.llmConfigured(), true);
    assert.equal(llm.llmVisionConfigured(), false);
    assert.equal(await llm.completeJson({ system: "JSON", user: "Read", images: [{ dataUrl: IMAGE }] }), null);
    assert.equal(calls.length, 0);
    await llm.completeJson({ system: "JSON", user: "Outline" });
    assert.equal(calls[0].model, "text-model");
  });
  await withProviders({ OPENROUTER_API_KEY: "fake-test-key", OPENROUTER_MODEL: "text-model", OPENROUTER_VISION_MODEL: "vision-model" }, mock, async (llm) => {
    assert.equal(llm.llmVisionConfigured(), true);
    const result = await llm.completeJson({ system: "JSON", user: "Read", images: [{ dataUrl: IMAGE }] });
    assert.equal(result.model, "vision-model");
    assert.deepEqual(calls.at(-1).provider, { require_parameters: true });
  });
});

test("an expired vision call returns while queued and never fetches after the queue is released", async () => {
  const calls = [];
  let release;
  let markStarted;
  const started = new Promise((resolve) => { markStarted = resolve; });
  await withProviders({ DEEPSEEK_API_KEY: "fake-test-key" }, async (url, options) => {
    calls.push(JSON.parse(options.body));
    markStarted();
    return new Promise((resolve) => { release = () => resolve(completionResponse()); });
  }, async (llm) => {
    const first = llm.completeJson({ system: "JSON", user: "Hold the queue", timeoutMs: 1000 });
    await started;
    const began = Date.now();
    try {
      const expired = await llm.completeJson({ system: "JSON", user: "Must expire", images: [{ dataUrl: IMAGE }], totalTimeoutMs: 40 });
      assert.equal(expired, null);
      assert.ok(Date.now() - began < 500, "a deadline must include queue waiting");
      assert.equal(calls.length, 1);
    } finally {
      release();
      await first;
    }
    await pause(60);
    assert.equal(calls.length, 1, "expired queued work must not make a late paid request");
  });
});

test("vision deadlines also bound in-flight requests and decline retries beyond the deadline", async () => {
  let release;
  let calls = 0;
  await withProviders({ DEEPSEEK_API_KEY: "fake-test-key" }, async () => {
    calls += 1;
    return new Promise((resolve) => { release = () => resolve(completionResponse()); });
  }, async (llm) => {
    const began = Date.now();
    const result = await llm.completeJson({ system: "JSON", user: "Read", images: [{ dataUrl: IMAGE }], totalTimeoutMs: 40 });
    assert.equal(result, null);
    assert.ok(Date.now() - began < 500);
    release();
    await pause(20);
    assert.equal(calls, 1);
  });
  calls = 0;
  await withProviders({ DEEPSEEK_API_KEY: "fake-test-key" }, async () => {
    calls += 1;
    return new Response("", { status: 429, headers: { "Retry-After": "20" } });
  }, async (llm) => {
    const began = Date.now();
    assert.equal(await llm.completeJson({ system: "JSON", user: "Read", images: [{ dataUrl: IMAGE }], totalTimeoutMs: 40 }), null);
    assert.ok(Date.now() - began < 500);
    await pause(60);
    assert.equal(calls, 1);
  });
});
