/**
 * Version diffs.
 *
 * `CourseVersion.snapshot` stores the course tree as it stood when the version
 * was published. This module turns two of those into a change list, so
 * "compare v3 → v4" is a real answer to "what did I actually change" rather than
 * two sentences of note.
 *
 * The comparison is positional on purpose. Matching by title would report a
 * rename as a deletion plus an addition, which is the least useful reading of a
 * change an instructor makes all the time. Position says "module 3 was renamed",
 * which is what happened.
 */

export type SnapshotActivity = { title: string; format: string; minutes: number };
export type SnapshotModule = { title: string; objective: string; activities: SnapshotActivity[] };
export type Snapshot = {
  title: string;
  brief: string;
  minutes: number;
  audience: string;
  modules: SnapshotModule[];
};

export type ChangeKind = "added" | "removed" | "renamed" | "changed";

export type Change = {
  kind: ChangeKind;
  scope: "course" | "module" | "activity";
  where: string;
  from?: string;
  to?: string;
};

/** Snapshots are JSON columns: anything could be in there. Validate, do not cast. */
export function parseSnapshot(value: unknown): Snapshot | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.title !== "string" || !Array.isArray(raw.modules)) return null;

  const modules: SnapshotModule[] = [];
  for (const entry of raw.modules) {
    if (!entry || typeof entry !== "object") continue;
    const module = entry as Record<string, unknown>;
    const activities: SnapshotActivity[] = [];
    if (Array.isArray(module.activities)) {
      for (const item of module.activities) {
        if (!item || typeof item !== "object") continue;
        const activity = item as Record<string, unknown>;
        if (typeof activity.title !== "string") continue;
        activities.push({
          title: activity.title,
          format: typeof activity.format === "string" ? activity.format : "reading",
          minutes: typeof activity.minutes === "number" ? activity.minutes : 0,
        });
      }
    }
    modules.push({
      title: typeof module.title === "string" ? module.title : "Untitled module",
      objective: typeof module.objective === "string" ? module.objective : "",
      activities,
    });
  }

  return {
    title: raw.title,
    brief: typeof raw.brief === "string" ? raw.brief : "",
    minutes: typeof raw.minutes === "number" ? raw.minutes : 0,
    audience: typeof raw.audience === "string" ? raw.audience : "mixed",
    modules,
  };
}

export function diffSnapshots(from: Snapshot, to: Snapshot): Change[] {
  const changes: Change[] = [];

  if (from.title !== to.title) {
    changes.push({ kind: "renamed", scope: "course", where: "Course title", from: from.title, to: to.title });
  }
  if (from.minutes !== to.minutes) {
    changes.push({ kind: "changed", scope: "course", where: "Time budget", from: `${from.minutes} min`, to: `${to.minutes} min` });
  }
  if (from.audience !== to.audience) {
    changes.push({ kind: "changed", scope: "course", where: "Audience", from: from.audience, to: to.audience });
  }

  const moduleCount = Math.max(from.modules.length, to.modules.length);
  for (let index = 0; index < moduleCount; index += 1) {
    const before = from.modules[index];
    const after = to.modules[index];
    const label = `Module ${index + 1}`;

    if (!before && after) {
      changes.push({ kind: "added", scope: "module", where: label, to: after.title });
      continue;
    }
    if (before && !after) {
      changes.push({ kind: "removed", scope: "module", where: label, from: before.title });
      continue;
    }
    if (!before || !after) continue;

    if (before.title !== after.title) {
      changes.push({ kind: "renamed", scope: "module", where: label, from: before.title, to: after.title });
    }

    const activityCount = Math.max(before.activities.length, after.activities.length);
    for (let inner = 0; inner < activityCount; inner += 1) {
      const oldActivity = before.activities[inner];
      const newActivity = after.activities[inner];
      const where = `${label} · activity ${inner + 1}`;

      if (!oldActivity && newActivity) {
        changes.push({ kind: "added", scope: "activity", where, to: newActivity.title });
        continue;
      }
      if (oldActivity && !newActivity) {
        changes.push({ kind: "removed", scope: "activity", where, from: oldActivity.title });
        continue;
      }
      if (!oldActivity || !newActivity) continue;

      if (oldActivity.title !== newActivity.title) {
        changes.push({ kind: "renamed", scope: "activity", where, from: oldActivity.title, to: newActivity.title });
      }
      if (oldActivity.format !== newActivity.format) {
        changes.push({ kind: "changed", scope: "activity", where: `${where} · format`, from: oldActivity.format, to: newActivity.format });
      }
      if (oldActivity.minutes !== newActivity.minutes) {
        changes.push({
          kind: "changed",
          scope: "activity",
          where: `${where} · minutes`,
          from: String(oldActivity.minutes),
          to: String(newActivity.minutes),
        });
      }
    }
  }

  return changes;
}
