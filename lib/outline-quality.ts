import type { OutlineModule } from "./generate";

const FORMATS = ["reading", "simulation", "code_lab", "role_play", "quiz"] as const;
const MIN_ACTIVITY_MINUTES = 2;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > 0 && cleaned.length <= max ? cleaned : null;
}

function duration(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 120;
}

/** Allocate whole minutes proportionally, honouring a minimum for each item. */
export function allocateMinutes(total: number, weights: number[], minimums: number[]): number[] | null {
  if (!Number.isInteger(total) || weights.length === 0 || weights.length !== minimums.length ||
      weights.some((weight) => !Number.isFinite(weight) || weight <= 0) ||
      minimums.some((minimum) => !Number.isInteger(minimum) || minimum < 0) ||
      minimums.reduce((sum, minimum) => sum + minimum, 0) > total) return null;

  const shares = Array<number>(weights.length).fill(0);
  let active = weights.map((_, index) => index);
  let remaining = total;
  // Fix items whose proportional share is below their minimum, then repartition.
  while (active.length > 0) {
    const weightSum = active.reduce((sum, index) => sum + weights[index], 0);
    const constrained = active.filter((index) => remaining * weights[index] / weightSum < minimums[index]);
    if (constrained.length === 0) {
      for (const index of active) shares[index] = remaining * weights[index] / weightSum;
      break;
    }
    for (const index of constrained) {
      shares[index] = minimums[index];
      remaining -= minimums[index];
    }
    active = active.filter((index) => !constrained.includes(index));
  }
  const result = shares.map(Math.floor);
  let remainder = total - result.reduce((sum, value) => sum + value, 0);
  const order = shares.map((share, index) => ({ index, fraction: share - result[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const item of order) {
    if (remainder <= 0) break;
    result[item.index] += 1;
    remainder -= 1;
  }
  return remainder === 0 ? result : null;
}

type ModelResult = { modules: OutlineModule[]; reason: null } | { modules: null; reason: string };
const reject = (reason: string): ModelResult => ({ modules: null, reason });

/** Model replies are untrusted: reject malformed content before adjusting time. */
export function normalizeModelOutline(value: unknown, target: number, requireReading: boolean): ModelResult {
  const raw = record(value)?.modules;
  if (!Array.isArray(raw) || raw.length < 3 || raw.length > 7) return reject("expected 3–7 modules");

  const modules: OutlineModule[] = [];
  const titles = new Set<string>();
  for (const [index, entry] of raw.entries()) {
    const module = record(entry);
    const title = text(module?.title, 90);
    const objective = text(module?.objective, 180);
    if (!module || !title || !objective) return reject(`module ${index + 1} needs a title and objective`);
    const titleKey = title.toLocaleLowerCase();
    if (titles.has(titleKey)) return reject("module titles must be distinct");
    titles.add(titleKey);
    if (!duration(module.minutes)) return reject(`module ${index + 1} has invalid minutes`);
    if (!Array.isArray(module.activities) || module.activities.length < 1 || module.activities.length > 3) {
      return reject(`module ${index + 1} needs 1–3 activities`);
    }
    const activities: OutlineModule["activities"] = [];
    for (const item of module.activities) {
      const activity = record(item);
      const activityTitle = text(activity?.title, 90);
      if (!activity || !activityTitle) return reject(`an activity in module ${index + 1} needs a title`);
      if (!FORMATS.includes(activity.format as typeof FORMATS[number])) return reject(`module ${index + 1} has an unsupported activity format`);
      if (!duration(activity.minutes)) return reject(`an activity in module ${index + 1} has invalid minutes`);
      activities.push({ title: activityTitle, format: activity.format as typeof FORMATS[number], minutes: activity.minutes });
    }
    if (!activities.some((activity) => activity.format !== "reading")) return reject(`module ${index + 1} needs an interactive activity`);
    modules.push({ title, objective, estimatedMinutes: module.minutes, activities });
  }
  if (requireReading && !modules.some((module) => module.activities.some((activity) => activity.format === "reading"))) {
    return reject("PDF diagrams need a reading activity to preserve their source and uncertainty");
  }
  const proposedTotal = modules.reduce((sum, module) => sum + module.estimatedMinutes, 0);
  if (proposedTotal < target / 2 || proposedTotal > target * 2) return reject("proposed course time is too far from the requested duration");
  const moduleMinutes = allocateMinutes(target, modules.map((module) => module.estimatedMinutes),
    modules.map((module) => module.activities.length * MIN_ACTIVITY_MINUTES));
  if (!moduleMinutes) return reject("too many activities for the requested duration");
  for (const [index, module] of modules.entries()) {
    const activityMinutes = allocateMinutes(moduleMinutes[index], module.activities.map((activity) => activity.minutes),
      module.activities.map(() => MIN_ACTIVITY_MINUTES));
    if (!activityMinutes) return reject(`module ${index + 1} has too many activities for its duration`);
    module.estimatedMinutes = moduleMinutes[index];
    module.activities.forEach((activity, activityIndex) => { activity.minutes = activityMinutes[activityIndex]; });
  }
  return { modules, reason: null };
}

/** Final guard for both model and template paths, before a draft is saved. */
export function checkOutline(value: unknown, target: number, template: boolean, requireReading: boolean): string | null {
  if (!Number.isInteger(target) || target < 15 || target > 120) return "The requested duration must be 15–120 minutes.";
  if (!Array.isArray(value) || value.length < (template ? 1 : 3) || value.length > 7) return "The draft has an invalid number of modules.";
  let total = 0;
  let hasReading = false;
  const titles = new Set<string>();
  for (const entry of value) {
    const module = record(entry);
    const title = text(module?.title, 90);
    if (!module || !title || !text(module.objective, 180)) return "A module is missing its title or objective.";
    const titleKey = title.toLocaleLowerCase();
    if (titles.has(titleKey)) return "Two modules have the same title.";
    titles.add(titleKey);
    if (!Number.isInteger(module.estimatedMinutes) || (module.estimatedMinutes as number) < 1) return "A module has invalid minutes.";
    if (!Array.isArray(module.activities) || module.activities.length < 1 || module.activities.length > 3) return "A module must have 1–3 activities.";
    let activityTotal = 0;
    let hasInteractive = false;
    for (const item of module.activities) {
      const activity = record(item);
      if (!activity || !text(activity.title, 90) || !FORMATS.includes(activity.format as typeof FORMATS[number])) return "An activity has a missing title or unsupported format.";
      if (!Number.isInteger(activity.minutes) || (activity.minutes as number) < MIN_ACTIVITY_MINUTES) return "Every activity must last at least 2 whole minutes.";
      activityTotal += activity.minutes as number;
      hasReading ||= activity.format === "reading";
      hasInteractive ||= activity.format !== "reading";
    }
    if (!hasInteractive) return "Every module needs an interactive activity.";
    if (activityTotal !== module.estimatedMinutes) return "Activity times do not add up to their module time.";
    total += module.estimatedMinutes as number;
  }
  if (total !== target) return "Module times do not add up to the requested course duration.";
  if (requireReading && !hasReading) return "The PDF diagram observations need a reading activity.";
  return null;
}
