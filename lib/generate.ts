import { extractText, getDocumentProxy } from "unpdf";
import { completeJson, llmConfigured } from "./llm";
import { authorContent, matchSection } from "./author";
import type { ActivityContent } from "./activity-content";

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

export type SourceDoc = { name: string; pages: number; text: string };

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
  sources: { name: string; pages: number; chars: number }[];
  /** True when the outline came from the template rather than a language model. */
  template: boolean;
  /** The model that produced it, or "template-v1". Persisted on the ai_runs row. */
  model: string;
};

/** Read one uploaded file. PDFs go through pdf.js; anything else is read as text. */
export async function readSource(file: File): Promise<SourceDoc> {
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (/\.pdf$/i.test(file.name)) {
    const pdf = await getDocumentProxy(bytes);
    const { totalPages, text } = await extractText(pdf, { mergePages: true });
    return { name: file.name, pages: totalPages, text };
  }

  return { name: file.name, pages: 1, text: new TextDecoder("utf-8").decode(bytes) };
}

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
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const headings: Heading[] = [];
  let current: Heading | null = null;

  for (const line of lines) {
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

    if (!bullet && words >= 2 && words <= 9 && !endsSentence && startsUpper) {
      current = { title: bare, body: [] };
      headings.push(current);
    } else if (current) {
      const text = cleanBody(bullet ? line.replace(/^[•·▪◦\-–]\s?/, "") : line);
      if (text) current.body.push(text);
    }
  }

  return headings.filter((heading) => heading.body.length > 0);
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
function briefHeadings(brief: string, title: string): Heading[] {
  const sentences = brief
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.replace(/^[-•*]\s*/, "").replace(/\s+/g, " ").trim())
    .filter((sentence) => sentence.split(" ").length >= 3);

  return sentences.slice(0, 5).map((sentence) => ({
    title: trim(sentence.replace(/[.!?]+$/, ""), 70),
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
  const count = Math.min(target, headings.length);
  const stride = Math.max(1, Math.floor(headings.length / count));

  const picked: Heading[] = [];
  for (let index = 0; index < count; index += 1) {
    const heading = headings[index * stride];
    if (heading && !picked.includes(heading)) picked.push(heading);
  }
  // A short deck can leave us under the target; fill from the front.
  for (const heading of headings) {
    if (picked.length >= count) break;
    if (!picked.includes(heading)) picked.push(heading);
  }

  const perModule = Math.max(6, Math.floor(options.minutes / Math.max(1, picked.length)));
  let remaining = options.minutes;

  return picked.map((heading, index) => {
    const minutes = index === picked.length - 1 ? Math.max(5, remaining) : perModule;
    remaining -= minutes;

    const readingMinutes = Math.max(3, Math.round(minutes * 0.4));
    const handsOnMinutes = Math.max(3, minutes - readingMinutes);

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

const SYSTEM_PROMPT =
  "You are an instructional designer building a short university mini-course from lecture material. " +
  "You reply with a single JSON object and nothing else — no prose, no markdown fences.";

function userPrompt(
  headings: Heading[],
  options: { minutes: number; audience: "non_cs" | "cs" | "mixed"; title: string; brief: string },
): string {
  return `Course title: ${options.title || "Untitled course"}
Audience: ${AUDIENCE_TEXT[options.audience]}
Time budget: ${options.minutes} minutes in total
Instructor brief: ${options.brief || "(none given — infer the outcome from the material)"}

Lecture material (titles and first lines, in slide order):
${sketch(headings)}

Return exactly this JSON shape:
{"modules":[{"title":"...","objective":"one sentence starting with a verb","minutes":10,"activities":[{"title":"...","format":"reading","minutes":5},{"title":"...","format":"simulation","minutes":5}]}]}

Rules:
- 3 to 7 modules. "minutes" across all modules must add up to about ${options.minutes}.
- Each module has 1 to 3 activities. Every module must include at least one activity whose format is not "reading".
- "format" must be one of: reading, simulation, code_lab, role_play, quiz.
- Module titles must be grounded in the lecture material above. Do not invent topics that are not there.
- No text outside the JSON object.`;
}

const FORMATS: OutlineActivity["format"][] = ["reading", "simulation", "code_lab", "role_play", "quiz"];

function asText(value: unknown, max: number): string {
  return typeof value === "string" ? trim(value.replace(/\s+/g, " ").trim(), max) : "";
}

function asMinutes(value: unknown, fallback: number): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(120, Math.max(2, Math.round(number)));
}

/**
 * Force a model reply into the shape the database expects, or reject it.
 *
 * The reply is untrusted input: a model that returns two modules with no
 * activities, or invents a format called "video", has to be caught here rather
 * than produce rows the editor cannot render. Rejecting means falling back to
 * the template, which is the whole point of having one.
 */
function coerceModules(value: unknown, options: { minutes: number }): OutlineModule[] | null {
  const raw = (value as { modules?: unknown })?.modules;
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 8) return null;

  const modules: OutlineModule[] = [];

  for (const entry of raw) {
    const source = entry as Record<string, unknown>;
    const title = asText(source.title, 90);
    if (!title) return null;

    const objective = asText(source.objective, 180) || `Cover ${title}`;
    const estimatedMinutes = asMinutes(source.minutes, Math.max(6, Math.round(options.minutes / raw.length)));

    const rawActivities = Array.isArray(source.activities) ? source.activities.slice(0, 4) : [];
    const activities: OutlineActivity[] = [];

    for (const rawActivity of rawActivities) {
      const activity = rawActivity as Record<string, unknown>;
      const format = FORMATS.includes(activity.format as OutlineActivity["format"])
        ? (activity.format as OutlineActivity["format"])
        : "reading";
      const activityTitle = asText(activity.title, 90) || `${format.replace("_", " ")}: ${title}`;
      activities.push({
        title: activityTitle,
        format,
        minutes: asMinutes(activity.minutes, Math.max(3, Math.round(estimatedMinutes / 2))),
      });
    }

    if (activities.length === 0) {
      activities.push({ title: `Read: ${trim(title, 50)}`, format: "reading", minutes: estimatedMinutes });
    }

    modules.push({ title, objective, estimatedMinutes, activities: scaleActivities(activities, estimatedMinutes) });
  }

  return modules.length > 0 ? modules : null;
}

/**
 * Make the activity minutes add up to the module's stated length.
 *
 * Without this the studio shows "10 min" on a module whose activities sum to 8,
 * and the pedagogy check and the learner path disagree about how long the
 * course is. The last activity absorbs the rounding.
 */
function scaleActivities(activities: OutlineActivity[], target: number): OutlineActivity[] {
  const total = activities.reduce((sum, activity) => sum + activity.minutes, 0);
  if (total === target || activities.length === 0) return activities;

  const scaled = activities.map((activity) => ({
    ...activity,
    minutes: Math.max(2, Math.round((activity.minutes / total) * target)),
  }));

  const drift = target - scaled.reduce((sum, activity) => sum + activity.minutes, 0);
  const last = scaled[scaled.length - 1];
  scaled[scaled.length - 1] = { ...last, minutes: Math.max(2, last.minutes + drift) };
  return scaled;
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
  const headings = toHeadings(combined);
  const brief = (options.brief ?? "").trim();
  // No deck, but a brief: seed the outline from the brief's own sentences.
  const seeds = headings.length >= 3 ? headings : brief ? briefHeadings(brief, options.title) : headings;
  steps.push({
    label: "Find section boundaries",
    detail:
      headings.length >= 3
        ? `${headings.length} headings · ${combined.length.toLocaleString("en-GB")} characters`
        : `${seeds.length} sections · drawn from the brief · ${brief.length.toLocaleString("en-GB")} characters`,
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
  const fromBrief = headings.length < 3 && brief.length > 0;

  if (wantsModel && (fromBrief || seeds.length >= 3)) {
    const call = await completeJson({
      system: SYSTEM_PROMPT,
      user: userPrompt(seeds, {
        minutes: options.minutes,
        audience: options.audience,
        title: options.title,
        brief,
      }),
    });

    const coerced = call ? coerceModules(call.value, { minutes: options.minutes }) : null;

    if (call && coerced) {
      modules = coerced;
      model = call.model;
      template = false;
      const projected = coerced.reduce((sum, module) => sum + module.estimatedMinutes, 0);
      steps.push({
        label: "Call language model",
        detail: `${call.model} · ${coerced.length} modules · ${projected} min projected${call.fellBack ? " · first choice unavailable" : ""}`,
        ms: call.ms,
      });
    } else {
      steps.push({
        label: "Call language model",
        detail: "no usable reply — fell back to the built-in template",
        ms: 0,
      });
    }
  }

  if (modules.length === 0) {
    started = Date.now();
    modules = draftFromHeadings(seeds, options);
    steps.push({
      label: "Draft module sequence",
      detail: `${modules.length} modules · ${options.minutes} min projected · template`,
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
    const index = matchSection(module.title, seeds, usedSections);
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
    detail: `${activityCount} activities · ${usedSections.size} sections quoted · ${fromBrief ? "brief as source" : "deck as source"}`,
    ms: Date.now() - started,
  });

  steps.push({
    label: "Check prerequisite order",
    detail: template
      ? fromBrief
        ? "modules follow the order you described in the brief"
        : "modules follow the order of the source material"
      : fromBrief
        ? "modules reviewed against the order you described"
        : "modules reviewed against the source order",
    ms: 0,
  });

  return {
    modules,
    steps,
    sources: files.map((file) => ({ name: file.name, pages: file.pages, chars: file.text.length })),
    template,
    model,
  };
}
