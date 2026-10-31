"use server";

import { requireStaff } from "@/lib/auth";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addActivity,
  addModule,
  fillActivityContent,
  importRoster,
  moveModule,
  publishCourse,
  removeActivity,
  removeModule,
  updateActivity,
  updateCourse,
  updateModule,
} from "@/lib/store";
import type { ActivityFormat } from "@/lib/types";

/**
 * Course editor mutations.
 *
 * Every write is a server action, so the editor works without client-side state
 * and without a hand-written API layer: the form posts, the store writes to
 * Postgres, the page is revalidated. That is the smallest thing that is
 * actually correct.
 */

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "");
}

function num(formData: FormData, key: string, fallback: number): number {
  const parsed = Number(formData.get(key));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

function refresh(courseId: string): void {
  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/courses");
}

export async function saveCourseAction(formData: FormData): Promise<void> {
  await requireStaff();
  const courseId = str(formData, "courseId");
  const audience = str(formData, "audience");
  await updateCourse(courseId, {
    title: str(formData, "title").trim() || "Untitled course",
    brief: str(formData, "brief"),
    audience: audience === "cs" || audience === "non_cs" ? audience : "mixed",
    minutes: num(formData, "minutes", 45),
  });
  refresh(courseId);
}

export async function addModuleAction(formData: FormData): Promise<void> {
  await requireStaff();
  const courseId = str(formData, "courseId");
  await addModule(courseId, str(formData, "title"));
  refresh(courseId);
}

export async function renameModuleAction(formData: FormData): Promise<void> {
  await requireStaff();
  const courseId = str(formData, "courseId");
  await updateModule(str(formData, "moduleId"), { title: str(formData, "title") });
  refresh(courseId);
}

export async function moveModuleAction(formData: FormData): Promise<void> {
  await requireStaff();
  const courseId = str(formData, "courseId");
  const direction = str(formData, "direction") === "up" ? -1 : 1;
  await moveModule(str(formData, "moduleId"), direction);
  refresh(courseId);
}

export async function removeModuleAction(formData: FormData): Promise<void> {
  await requireStaff();
  const courseId = str(formData, "courseId");
  await removeModule(str(formData, "moduleId"));
  refresh(courseId);
}

export async function addActivityAction(formData: FormData): Promise<void> {
  await requireStaff();
  const courseId = str(formData, "courseId");
  const format = str(formData, "format") as ActivityFormat;
  await addActivity(str(formData, "moduleId"), str(formData, "title"), format || "reading");
  refresh(courseId);
}

export async function updateActivityAction(formData: FormData): Promise<void> {
  await requireStaff();
  const courseId = str(formData, "courseId");
  await updateActivity(str(formData, "activityId"), {
    title: str(formData, "title"),
    minutes: num(formData, "minutes", 8),
    format: str(formData, "format") as ActivityFormat,
  });
  refresh(courseId);
}

export async function removeActivityAction(formData: FormData): Promise<void> {
  await requireStaff();
  const courseId = str(formData, "courseId");
  await removeActivity(str(formData, "activityId"));
  refresh(courseId);
}

export async function publishCourseAction(formData: FormData): Promise<void> {
  await requireStaff();
  const courseId = str(formData, "courseId");
  // Publishing is the promise that a course is worth a learner's time, so it is
  // also the point where a course with no activity bodies gets them. Filling
  // after publish would ship the generic template to whoever enrolled first.
  await fillActivityContent(courseId);
  await publishCourse(courseId);
  refresh(courseId);
}

/**
 * Write activity bodies for a course that has none.
 *
 * Offered in the editor because a draft can sit with structure and no content
 * and look finished: every activity opens, every format renders, and every quiz
 * asks the same generic question. This fills from the module objectives — the
 * only text such a course still owns — and reports how many it wrote.
 */
export async function fillContentAction(formData: FormData): Promise<void> {
  await requireStaff();
  const courseId = str(formData, "courseId");
  const written = await fillActivityContent(courseId);
  refresh(courseId);
  revalidatePath("/learn");
  redirect(`/courses/${courseId}?filled=${written}`);
}

/**
 * Roster import.
 *
 * The admin screen has promised "students import themselves from a Moodle
 * roster or CSV" since the first week; this is the control that makes that
 * sentence true. The parser is deliberately forgiving — one line per person,
 * `name,email` or just `email` — because a roster export is a file somebody else
 * produced, and rejecting it on a trailing comma is how a feature gets a
 * reputation for being fussy.
 */
export async function importRosterAction(formData: FormData): Promise<void> {
  await requireStaff();
  const courseId = str(formData, "courseId");
  const raw = str(formData, "roster");

  const rows: Array<{ name: string; email: string }> = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.toLowerCase() === "name,email") continue;
    const [first, second] = trimmed.split(",").map((part) => part.trim());
    const email = (second ?? first ?? "").toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) continue;
    const name = second ? first : email.split("@")[0];
    rows.push({ name: name || email.split("@")[0], email });
  }

  const added = await importRoster(courseId, rows);
  refresh(courseId);
  revalidatePath("/admin");
  redirect(`/courses/${courseId}?roster=${added}`);
}

export async function openCourseAction(formData: FormData): Promise<void> {
  redirect(`/courses/${str(formData, "courseId")}`);
}
