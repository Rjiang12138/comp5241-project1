"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addActivity,
  addModule,
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
  const courseId = str(formData, "courseId");
  await addModule(courseId, str(formData, "title"));
  refresh(courseId);
}

export async function renameModuleAction(formData: FormData): Promise<void> {
  const courseId = str(formData, "courseId");
  await updateModule(str(formData, "moduleId"), { title: str(formData, "title") });
  refresh(courseId);
}

export async function moveModuleAction(formData: FormData): Promise<void> {
  const courseId = str(formData, "courseId");
  const direction = str(formData, "direction") === "up" ? -1 : 1;
  await moveModule(str(formData, "moduleId"), direction);
  refresh(courseId);
}

export async function removeModuleAction(formData: FormData): Promise<void> {
  const courseId = str(formData, "courseId");
  await removeModule(str(formData, "moduleId"));
  refresh(courseId);
}

export async function addActivityAction(formData: FormData): Promise<void> {
  const courseId = str(formData, "courseId");
  const format = str(formData, "format") as ActivityFormat;
  await addActivity(str(formData, "moduleId"), str(formData, "title"), format || "reading");
  refresh(courseId);
}

export async function updateActivityAction(formData: FormData): Promise<void> {
  const courseId = str(formData, "courseId");
  await updateActivity(str(formData, "activityId"), {
    title: str(formData, "title"),
    minutes: num(formData, "minutes", 8),
    format: str(formData, "format") as ActivityFormat,
  });
  refresh(courseId);
}

export async function removeActivityAction(formData: FormData): Promise<void> {
  const courseId = str(formData, "courseId");
  await removeActivity(str(formData, "activityId"));
  refresh(courseId);
}

export async function publishCourseAction(formData: FormData): Promise<void> {
  const courseId = str(formData, "courseId");
  await publishCourse(courseId);
  refresh(courseId);
}

export async function openCourseAction(formData: FormData): Promise<void> {
  redirect(`/courses/${str(formData, "courseId")}`);
}
