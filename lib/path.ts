import { completeJson, llmConfigured } from "./llm";

/**
 * Designing a learning path (R9/R10).
 *
 * The prototype's copy makes a specific promise: the path sequences courses
 * that already exist and *generates* the ones that do not. Both halves are
 * modelled here. A step either points at a library course or carries no
 * `courseId` at all — a gap — and the UI says which, because "2 of your 4 steps
 * do not exist yet" is the honest version of that sentence.
 *
 * Like the course generator, this runs with or without a model. The template is
 * a real algorithm (score the library against the goal, then scaffold from
 * short to long), not a placeholder: it produces a defensible order on its own.
 */

export type LibraryCourse = {
  id: string;
  title: string;
  brief: string;
  audience: string;
  minutes: number;
  modules: number;
  activities: number;
};

export type PathStepDraft = {
  title: string;
  detail: string;
  minutes: number;
  courseId: string | null;
};

export type PathDraft = {
  steps: PathStepDraft[];
  model: string;
  rationale: string;
  template: boolean;
};

export type PathRequest = {
  goal: string;
  domain: string;
  level: string;
  hoursPerWeek: number;
  weeks: number;
};

const LEVEL_COPY: Record<string, string> = {
  beginner: "start from the vocabulary, not the tooling",
  some: "assume you can read code but have not shipped anything",
  confident: "skip the fundamentals and go straight to judgement calls",
};

const DOMAIN_COPY: Record<string, string> = {
  backend: "services, data and the things that break at 2am",
  data: "questions, pipelines and the difference between a number and a finding",
  product: "who it is for, what changes for them, how you would know",
  design: "interfaces, states and the cost of a wrong default",
};

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3);
}

/** How well a library course answers this goal. Higher is better. */
function score(course: LibraryCourse, request: PathRequest): number {
  const goalWords = new Set(words(`${request.goal} ${request.domain}`));
  const courseWords = words(`${course.title} ${course.brief}`);
  const overlap = courseWords.filter((word) => goalWords.has(word)).length;

  // A non-CS beginner should not be handed a CS-only course first.
  const audienceFit =
    request.level === "beginner" && course.audience === "cs" ? -1 : course.audience === "mixed" ? 1 : 0;

  return overlap * 2 + audienceFit;
}

function template(request: PathRequest, library: LibraryCourse[]): PathDraft {
  const weeks = Math.min(8, Math.max(2, request.weeks));
  const budgetMinutes = request.hoursPerWeek * 60;

  const ranked = [...library]
    .map((course) => ({ course, score: score(course, request) }))
    .sort((a, b) => b.score - a.score || a.course.minutes - b.course.minutes)
    .map((row) => row.course);

  // Within the chosen set, go short → long: the first week should be the one
  // that cannot fail, not the hardest thing in the library.
  const chosen = ranked.slice(0, weeks).sort((a, b) => a.minutes - b.minutes);

  const steps: PathStepDraft[] = [];
  for (let index = 0; index < weeks; index += 1) {
    const course = chosen[index];
    if (course) {
      steps.push({
        title: `Week ${index + 1} · ${course.title}`,
        detail: `${course.modules} modules · ${course.activities} activities · ${course.minutes} min · from the library`,
        minutes: Math.min(budgetMinutes, course.minutes),
        courseId: course.id,
      });
    } else {
      steps.push({
        title: `Week ${index + 1} · ${gapTitle(request, index)}`,
        detail: `Not in the library — Praxis would generate this course for you (${DOMAIN_COPY[request.domain] ?? "the domain you chose"}).`,
        minutes: budgetMinutes,
        courseId: null,
      });
    }
  }

  return {
    steps,
    model: "template-v1",
    rationale: `Ordered shortest first, because ${LEVEL_COPY[request.level] ?? "the first week should not be the hardest"}. Each step assumes the evidence from the one before it.`,
    template: true,
  };
}

function gapTitle(request: PathRequest, index: number): string {
  const subject = request.goal.split(/[.!?]/)[0].trim().slice(0, 60) || request.domain;
  const shapes = [
    `What ${subject.toLowerCase()} actually involves`,
    `Build one small ${request.domain} artefact end to end`,
    `Review work you did not write`,
    `Practise the part you will be judged on`,
  ];
  return shapes[index % shapes.length];
}

const SYSTEM =
  "You design short, sequenced learning paths from a library of existing mini-courses. " +
  "You reply with a single JSON object and nothing else — no prose, no markdown fences.";

function prompt(request: PathRequest, library: LibraryCourse[]): string {
  return `Learner goal: ${request.goal}
Domain: ${request.domain}
Starting point: ${request.level}
Time available: ${request.hoursPerWeek} hours per week, for ${request.weeks} weeks

Available courses (id | title | audience | minutes | brief):
${library.map((course) => `${course.id} | ${course.title} | ${course.audience} | ${course.minutes} | ${course.brief}`).join("\n")}

Return exactly this JSON:
{"steps":[{"title":"Week 1 · ...","detail":"one line on what this week is for","minutes":120,"courseId":"c-sef-or-null"}],"rationale":"one sentence on why this order"}

Rules:
- Exactly ${request.weeks} steps, one per week.
- "courseId" must be an id from the list above, or null when no course fits. Do not invent ids.
- Use a null courseId rather than stretching a course that does not fit the goal.
- Order the steps so each one assumes the evidence the previous one produced.
- No text outside the JSON object.`;
}

export async function designPath(request: PathRequest, library: LibraryCourse[]): Promise<PathDraft> {
  if (!llmConfigured() || library.length === 0) return template(request, library);

  const call = await completeJson({ system: SYSTEM, user: prompt(request, library), maxTokens: 1200 });
  if (!call) return template(request, library);

  const raw = (call.value as { steps?: unknown; rationale?: unknown })?.steps;
  if (!Array.isArray(raw) || raw.length < 2) return template(request, library);

  const known = new Map(library.map((course) => [course.id, course]));
  const steps: PathStepDraft[] = [];

  for (const entry of raw.slice(0, 8)) {
    const step = entry as Record<string, unknown>;
    const title = typeof step.title === "string" ? step.title.trim().slice(0, 90) : "";
    if (!title) return template(request, library);

    const courseId = typeof step.courseId === "string" && known.has(step.courseId) ? step.courseId : null;
    const course = courseId ? known.get(courseId) : null;
    const minutes = Number(step.minutes);

    steps.push({
      title,
      detail:
        typeof step.detail === "string" && step.detail.trim()
          ? step.detail.trim().slice(0, 200)
          : course
            ? `${course.modules} modules · ${course.activities} activities · ${course.minutes} min`
            : "Not in the library — Praxis would generate this course.",
      minutes: Number.isFinite(minutes) ? Math.min(600, Math.max(15, Math.round(minutes))) : course?.minutes ?? 60,
      courseId,
    });
  }

  return {
    steps,
    model: call.model,
    rationale:
      typeof call.value === "object" && call.value && typeof (call.value as { rationale?: unknown }).rationale === "string"
        ? String((call.value as { rationale: string }).rationale).slice(0, 300)
        : "Sequenced so each step assumes the evidence from the one before it.",
    template: false,
  };
}
