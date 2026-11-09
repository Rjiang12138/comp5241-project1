import { completeJson, llmConfigured } from "./llm";
import { authorContent, matchSection } from "./author";
import type { ActivityContent } from "./activity-content";
import type { SourceDoc } from "./source";
import { allocateMinutes, normalizeModelOutline } from "./outline-quality";
import { OUTLINE_PROMPT, renderPrompt } from "./prompts";
import { auditAttempt, type AiAuditEntry } from "./ai-audit";

export { readSource, SourceReadError } from "./source";
export type { SourceDoc } from "./source";

/**
 * Turning an instructor's own material into a draft outline.
 *
 * This is the step the brief calls "generate new mini-courses from their own
 * topics, requirements and teaching content" (R7). The pipeline — upload, parse,
 * segment, persist — is what the rest of the product hangs off, so it is built
 * to run twice: once through a language model when one is configured, and once
 * through `draftFromHeadings` when it is not, or when the model is unavailable.
 *
 * Which path ran is not hidden. `GeneratedOutline.template` and
 * `GeneratedOutline.model` travel with the outline into the studio screen and
 * into the `ai_runs` row, so a draft can always be traced back to how it was
 * made. A generator that silently degrades is worse than one that says so.
 */

export type OutlineActivity = {
  title: string;
  format: "reading" | "simulation" | "code_lab" | "role_play" | "quiz";
  minutes: number;
  /**
   * The activity's body, written from the source section at generation time.
   * Stored on the row so the course does not depend on `contentFor`'s fallback
   * — which is what used to make every generated course read the same.
   */
  payload?: ActivityContent;
};

export type OutlineModule = {
  title: string;
  objective: string;
  estimatedMinutes: number;
  activities: OutlineActivity[];
};

export type GenerationStep = { label: string; detail: string; ms: number };

export type GeneratedOutline = {
  modules: OutlineModule[];
  steps: GenerationStep[];
  auditRuns: AiAuditEntry[];
  sources: { name: string; pages: number; chars: number; visualPages?: number[]; visualModel?: string }[];
  /** True when the outline came from the template rather than a language model. */
  template: boolean;
  /** The model that produced it, or "template-v1". Persisted on the ai_runs row. */
  model: string;
};

type Heading = { title: string; body: string[] };

/**
 * Strip the things that ride along with slide bullets: footer URLs, the page
 * number that got glued to the next line, and the whitespace left behind.
 */
function cleanBody(line: string): string {
  const cleaned = line
    .replace(/https?:\/\/\S+/gi, "")
    // A leading page number, but not the "1970" in "1970s".
    .replace(/^\d{1,3}(?!\d)\s+/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned.length >= 3 ? cleaned : "";
}

/**
 * Split a slide deck into headings and the lines under them.
 *
 * Lecture PDFs are not documents with paragraphs; they are slides with a title,
 * a handful of bullets and a page number. So the test for a heading is "short,
 * not a bullet, no terminal punctuation" rather than anything about font size,
 * which pdf.js does not give us.
 */
function toHeadings(text: string): Heading[] {
  const hasMarkdownHeadings = /^\s*#{1,6}\s+\S/m.test(text);
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const headings: Heading[] = [];
  let current: Heading | null = null;

  for (const line of lines) {
    const markdownHeading = /^#{1,6}\s+(.+)$/.exec(line);
    if (markdownHeading) {
      current = { title: markdownHeading[1].replace(/\s+#+\s*$/, ""), body: [] };
      headings.push(current);
      continue;
    }
    if (/^\d{1,3}$/.test(line)) continue; // page number
    if (/^https?:\/\//i.test(line)) continue;
    if (/^references?:?$/i.test(line)) {
      current = null;
      continue;
    }

    const bullet = /^[•·▪◦\-–]\s?/.test(line);

    // A slide title that wrapped across two lines arrives as two lines, the
    // second of which starts lower-case and has no terminal punctuation. Testing
    // the line as-is turns "…how do you decide?" + "decide?”" into a heading, so
    // strip trailing quotes first and require a capital and two words. Closing
    // brackets are left alone: "(SDLC)" is part of the title.
    const bare = line.replace(/[\s"'”’]+$/, "");
    const words = bare.split(" ").length;
    const endsSentence = /[.!?:;]$/.test(bare);
    const startsUpper = /^[A-Z0-9(“"]/.test(bare);

    if (!hasMarkdownHeadings && !bullet && words >= 2 && words <= 9 && !endsSentence && startsUpper) {
      current = { title: bare, body: [] };
      headings.push(current);
    } else if (current) {
      const text = cleanBody(bullet ? line.replace(/^[•·▪◦\-–]\s?/, "") : line);
      if (text) current.body.push(text);
    }
  }

  return headings.filter((heading) => heading.body.length > 0);
}

function sourceHeadings(source: SourceDoc): Heading[] {
  const visualHeadings = source.visual ? toHeadings(source.visual.text) : [];
  // CSV rows are teaching material, not slide titles or an enrolment roster.
  const headings = /\.csv$/i.test(source.name) ? [] : toHeadings(source.text);
  if (headings.length > 0) return [...visualHeadings, ...headings];

  const body = source.text.split(/\r\n?|\n/).map((line) => line.trim()).filter(Boolean);
  return [...visualHeadings, ...(body.length > 0 ? [{ title: trim(body[0], 70), body }] : [])];
}

/**
 * The brief is material too.
 *
 * With no deck uploaded the pipeline had nothing to read: `toHeadings("")` is
 * empty, the model call is gated on "at least three sections" so it was skipped,
 * and the template had no headings to draft from. "Generate outline" then
 * answered "No sections found in that material" on a screen whose own copy says
 * "Without one, the brief alone is enough to start". The brief is split into its
 * sentences and the strongest ones become the section seeds, so both the model
 * path and the template path have something to work with.
 */
function briefHeadings(brief: string): Heading[] {
  const sentences = brief
    .split(/(?<=[.!?])\s+|(?<=[。！？])|\n+/)
    .map((sentence) => sentence.replace(/^[-•*]\s*/, "").replace(/\s+/g, " ").trim())
    .filter((sentence) => /[\p{L}\p{N}]/u.test(sentence));

  return sentences.slice(0, 5).map((sentence) => ({
    title: trim(sentence.replace(/[.!?。！？]+$/, ""), 70),
    body: [sentence],
  }));
}

/** Hands-on formats, ordered so a non-CS audience meets fewer code labs. */
function handsOnFor(audience: "non_cs" | "cs" | "mixed", index: number): OutlineActivity["format"] {
  const nonCs: OutlineActivity["format"][] = ["simulation", "role_play", "quiz", "code_lab"];
  const cs: OutlineActivity["format"][] = ["code_lab", "simulation", "role_play", "quiz"];
  const mixed: OutlineActivity["format"][] = ["code_lab", "role_play", "simulation", "quiz"];
  const pool = audience === "non_cs" ? nonCs : audience === "cs" ? cs : mixed;
  return pool[index % pool.length];
}

function trim(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trim()}…`;
}

/**
 * The template generator.
 *
 * It does three honest things: it takes module titles from the instructor's own
 * slides, it takes each module's objective from the first line under that title,
 * and it distributes the requested minutes across the modules it picked. It does
 * not invent content, which is why a generated course reads like an index of the
 * deck rather than a course written by someone who understood it.
 */
function draftFromHeadings(
  headings: Heading[],
  options: { minutes: number; audience: "non_cs" | "cs" | "mixed"; title: string },
): OutlineModule[] {
  const target = Math.min(7, Math.max(3, Math.round(options.minutes / 9)));
  // Repeated slide headings should not produce indistinguishable modules.
  const seen = new Set<string>();
  const distinct = headings.filter((heading) => {
    const key = trim(heading.title, 70).toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const count = Math.min(target, distinct.length, Math.floor(options.minutes / 4));
  if (count === 0) return [];
  const stride = Math.max(1, Math.floor(distinct.length / count));

  const picked: Heading[] = [];
  for (let index = 0; index < count; index += 1) {
    const heading = distinct[index * stride];
    if (heading && !picked.includes(heading)) picked.push(heading);
  }
  // A short deck can leave us under the target; fill from the front.
  for (const heading of distinct) {
    if (picked.length >= count) break;
    if (!picked.includes(heading)) picked.push(heading);
  }

  const moduleMinutes = allocateMinutes(options.minutes, picked.map(() => 1), picked.map(() => 4));
  if (!moduleMinutes) return [];

  return picked.map((heading, index) => {
    const minutes = moduleMinutes[index];
    const [readingMinutes, handsOnMinutes] = allocateMinutes(minutes, [0.4, 0.6], [2, 2])!;

    return {
      title: trim(heading.title, 70),
      objective: trim(heading.body[0] ?? `Cover ${heading.title}`, 150),
      estimatedMinutes: minutes,
      activities: [
        {
          title: `Read: ${trim(heading.title, 50)}`,
          format: "reading" as const,
          minutes: readingMinutes,
        },
        {
          title: activityTitle(handsOnFor(options.audience, index), heading.title),
          format: handsOnFor(options.audience, index),
          minutes: handsOnMinutes,
        },
      ],
    };
  });
}

function activityTitle(format: OutlineActivity["format"], topic: string): string {
  const short = trim(topic, 45);
  switch (format) {
    case "code_lab":
      return `Code lab: ${short}`;
    case "simulation":
      return `Simulation: ${short}`;
    case "role_play":
      return `Role play: ${short}`;
    case "quiz":
      return `Checkpoint quiz: ${short}`;
    default:
      return `Read: ${short}`;
  }
}

const AUDIENCE_TEXT: Record<"non_cs" | "cs" | "mixed", string> = {
  non_cs: "first-year students who have never written code (non-CS)",
  cs: "computer science undergraduates",
  mixed: "a mix of CS and non-CS students",
};

/**
 * A compact sketch of the deck for the prompt.
 *
 * Sending 24k characters of raw slide text costs tokens and produces worse
 * output, because the model starts quoting bullets instead of designing a
 * sequence. Titles plus their first two lines is enough to see the structure.
 */
function sketch(headings: Heading[], limit = 45): string {
  const picked = headings.slice(0, limit);
  return picked
    .map((heading, index) => {
      const bullets = heading.body.slice(0, 2).map((line) => `   - ${trim(line, 110)}`);
      return [`${index + 1}. ${heading.title}`, ...bullets].join("\n");
    })
    .join("\n");
}

function userPrompt(
  headings: Heading[],
  options: { minutes: number; audience: "non_cs" | "cs" | "mixed"; title: string; brief: string; visualText?: string },
): string {
  return renderPrompt(OUTLINE_PROMPT.userTemplate, {
    title: options.title || "Untitled course", audience: AUDIENCE_TEXT[options.audience], minutes: String(options.minutes),
    brief: options.brief || "(none given — infer the outcome from the material)", sketch: sketch(headings),
    visualText: options.visualText || "(none)",
  });
}

/**
 * Parse the uploaded material and draft an outline from it.
 *
 * Every phase is timed and returned, because the studio screen shows a
 * generation log and a log that is written by hand is a lie the moment the
 * pipeline changes.
 */
export async function generateOutline(
  files: SourceDoc[],
  options: {
    minutes: number;
    audience: "non_cs" | "cs" | "mixed";
    title: string;
    brief?: string;
    /** Defaults to "use a model when one is configured". */
    useModel?: boolean;
  },
): Promise<GeneratedOutline> {
  const steps: GenerationStep[] = [];
  const auditRuns: AiAuditEntry[] = files.flatMap((file) => file.visual
    ? file.visual.auditRuns ?? [{ purpose: "vision", promptVersion: "legacy-unknown", model: file.visual.model,
      provider: file.visual.provider, outcome: "used", tokensIn: null, tokensOut: null, latencyMs: file.visual.ms,
      metadata: { fileName: file.name, pages: file.visual.pages } }]
    : []);
  for (const file of files) {
    if (file.visual) steps.push({
      label: `Read PDF diagrams: ${file.name}`,
      detail: `pages ${file.visual.pages.join(", ")} · ${file.visual.provider} · ${file.visual.model} · AI interpretation, teacher review required`,
      ms: file.visual.ms,
    });
  }

  let started = Date.now();
  const combined = files.map((file) => file.text).join("\n");
  steps.push({
    label: "Parse source material",
    detail:
      files.length === 0
        ? "no file — starting from the brief"
        : `${files.length} ${files.length === 1 ? "file" : "files"} · ${files.reduce((sum, file) => sum + file.pages, 0)} pages indexed`,
    ms: Date.now() - started,
  });

  started = Date.now();
  const headings = files.flatMap(sourceHeadings);
  const brief = (options.brief ?? "").trim();
  // A short or unheaded upload must not be replaced by the accompanying brief.
  const fromBrief = files.length === 0;
  const seeds = fromBrief ? briefHeadings(brief) : headings;
  steps.push({
    label: "Find section boundaries",
    detail:
      fromBrief
        ? `${seeds.length} sections · drawn from the brief · ${brief.length.toLocaleString("en-GB")} characters`
        : `${seeds.length} sections · drawn from uploaded material · ${combined.length.toLocaleString("en-GB")} characters`,
    ms: Date.now() - started,
  });

  const wantsModel = options.useModel ?? llmConfigured();
  let modules: OutlineModule[] = [];
  let model = "template-v1";
  let template = true;

  // The three-section floor exists for decks: rewriting a two-heading handout
  // into a course invents more than it reads. A brief is different — it is
  // written as an instruction, and designing the sequence is the job being asked
  // for — so one sentence is enough to call the model.
  if (wantsModel && (fromBrief || seeds.length >= 3 || files.some((file) => file.visual))) {
    const attempts: AiAuditEntry[] = [];
    const call = await completeJson({
      system: OUTLINE_PROMPT.system,
      onAttempt: (attempt) => attempts.push(auditAttempt("outline", OUTLINE_PROMPT.version, attempt)),
      ...(files.some((file) => file.visual) ? { totalTimeoutMs: 20_000 } : {}),
      user: userPrompt(seeds, {
        minutes: options.minutes,
        audience: options.audience,
        title: options.title,
        brief,
        visualText: files.filter((file) => file.visual).map((file) => `${file.name}\n${file.visual!.text}`).join("\n\n"),
      }),
    });

    const checked = call ? normalizeModelOutline(call.value, options.minutes, files.some((file) => !!file.visual)) : null;
    const coerced = checked?.modules ?? null;
    if (call && !attempts.some((attempt) => attempt.outcome === "used")) {
      attempts.push({ purpose: "outline", promptVersion: OUTLINE_PROMPT.version, model: call.model, provider: call.provider,
        outcome: "used", tokensIn: call.tokensIn ?? null, tokensOut: call.tokensOut ?? null, latencyMs: call.ms });
    }
    if (call && !coerced) {
      const reply = attempts.findLast((attempt) => attempt.outcome === "used");
      if (reply) { reply.outcome = "rejected"; reply.metadata = { ...reply.metadata, reason: checked?.reason ?? "invalid_outline" }; }
    }
    auditRuns.push(...attempts);

    if (call && coerced) {
      modules = coerced;
      model = call.model;
      template = false;
      const projected = coerced.reduce((sum, module) => sum + module.estimatedMinutes, 0);
      steps.push({
        label: "Call language model",
        // Naming the provider matters now that there are two: "gpt-4o-mini" alone
        // does not say whether the spare answered, and the spare is the thing to
        // look at when a run is slow or a free tier is exhausted.
        detail: `${call.provider} · ${call.model} · ${coerced.length} modules · ${projected} min projected${call.fellBack ? " · first choice unavailable" : ""}`,
        ms: call.ms,
      });
    } else {
      steps.push({
        label: "Call language model",
        detail: checked?.reason
          ? `model draft rejected: ${checked.reason} — fell back to the built-in template`
          : "model unavailable — fell back to the built-in template",
        ms: call?.ms ?? 0,
      });
    }
  }

  if (modules.length === 0) {
    started = Date.now();
    modules = draftFromHeadings(seeds, options);
    if (modules.length) auditRuns.push({ purpose: "outline", promptVersion: "template-v1", model: "template-v1", provider: null,
      outcome: "template", tokensIn: null, tokensOut: null, latencyMs: Date.now() - started });
    steps.push({
      label: "Draft module sequence",
      detail: `${modules.length} modules · ${options.minutes} min projected · template${modules.length > 0 && modules.length < 3 ? " · limited source sections; add material for more modules" : ""}`,
      ms: Date.now() - started,
    });
  }

  started = Date.now();
  const activityCount = modules.reduce((sum, module) => sum + module.activities.length, 0);
  const handsOn = modules.reduce(
    (sum, module) => sum + module.activities.filter((activity) => activity.format !== "reading").length,
    0,
  );
  steps.push({
    label: "Match activity formats",
    detail: `${activityCount} activities · ${handsOn} hands-on · ${options.audience.replace("_", "-")} audience`,
    ms: Date.now() - started,
  });

  /*
   * Write the bodies.
   *
   * Up to here the outline is a table of contents: module titles, objectives,
   * and an activity format per row. The player could render that — `contentFor`
   * fills anything missing from a template — but every generated course then
   * read as the same generic quiz about a different noun. The text that makes
   * it a course is already in `seeds`: each module came from a section of the
   * deck, and that section has a title and a body. No second model call, no
   * invented facts — the reading quotes the slides, and the quiz blanks a term
   * from a sentence that is in the reading.
   */
  started = Date.now();
  const usedSections = new Set<number>();
  const objectives = modules.map((module) => module.objective);
  modules = modules.map((module) => {
    // Template titles are exact, including languages the English token matcher cannot score.
    const exact = seeds.findIndex((seed, index) => !usedSections.has(index) && trim(seed.title, 70) === module.title);
    const index = exact >= 0 ? exact : matchSection(module.title, seeds, usedSections);
    if (index !== null) usedSections.add(index);
    const section = index !== null ? { title: seeds[index].title, body: seeds[index].body } : null;

    return {
      ...module,
      activities: module.activities.map((activity) => ({
        ...activity,
        payload: authorContent({
          format: activity.format,
          title: activity.title,
          moduleTitle: module.title,
          objective: module.objective,
          courseTitle: options.title,
          section,
          siblings: objectives.filter((objective) => objective !== module.objective),
        }),
      })),
    };
  });
  steps.push({
    label: "Write activity bodies",
    detail: `${activityCount} activities · ${usedSections.size} sections quoted · ${fromBrief ? "brief as source" : "uploaded material as source"}`,
    ms: Date.now() - started,
  });

  // Title matching cannot reliably associate a rewritten model title with
  // "PDF page N". Preserve the full, attributed diagram evidence once in the
  // first reading rather than silently dropping it or presenting it as a quote.
  const visualEvidence = files.filter((file) => file.visual);
  const firstReading = modules.flatMap((module) => module.activities).find((activity) => activity.payload?.kind === "reading");
  if (firstReading?.payload?.kind === "reading" && visualEvidence.length > 0) {
    firstReading.payload.blocks.push(...visualEvidence.map((file) => ({
      heading: `${file.name} · PDF pages ${file.visual!.pages.join(", ")} · AI visual interpretation — verify against the source`,
      text: file.visual!.text,
    })));
  }

  steps.push({
    label: "Review source order",
    detail: template
      ? fromBrief
        ? "modules follow the order you described in the brief"
        : "modules follow the order of the source material"
      : fromBrief
        ? "model-proposed order; instructor review required"
        : "model-proposed order; check against source material",
    ms: 0,
  });

  return {
    modules,
    steps,
    auditRuns,
    sources: files.map((file) => ({
      name: file.name,
      pages: file.pages,
      chars: file.text.length + (file.visual?.text.length ?? 0),
      ...(file.visual ? { visualPages: file.visual.pages, visualModel: file.visual.model } : {}),
    })),
    template,
    model,
  };
}
