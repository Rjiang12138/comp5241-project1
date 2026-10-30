"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { enrollLearner, getLatestPath, pathLibrary, savePath, setPathStepStatus } from "@/lib/store";
import { designPath } from "@/lib/path";

/**
 * Path builder writes.
 *
 * Every generation inserts a new `LearningPath` rather than replacing the last
 * one, so "regenerate" is safe: the previous attempt is still there to compare
 * against, which is what the prototype's "Compare with last draft" was reaching
 * for on the studio screen.
 */

export async function designPathAction(formData: FormData): Promise<void> {
  const session = await getSession();
  const goal = String(formData.get("goal") ?? "").trim();
  if (goal.length < 12) redirect("/path?error=goal");

  const domain = String(formData.get("domain") ?? "backend");
  const level = String(formData.get("level") ?? "beginner");
  const hoursPerWeek = Math.min(40, Math.max(1, Number(formData.get("hours")) || 4));
  const weeks = Math.min(12, Math.max(2, Number(formData.get("weeks")) || 4));

  const library = await pathLibrary();
  const draft = await designPath({ goal, domain, level, hoursPerWeek, weeks }, library);

  await savePath({
    userId: session.userId,
    goal,
    domain,
    level,
    hoursPerWeek,
    weeks,
    model: draft.model,
    steps: draft.steps,
  });

  revalidatePath("/path");
  redirect("/path?generated=1");
}

/** Replace a step with the best library course this path has not used yet. */
export async function swapStepAction(formData: FormData): Promise<void> {
  const stepId = String(formData.get("stepId") ?? "");
  if (!stepId) return;

  const step = await prisma.pathStep.findUnique({ where: { id: stepId }, include: { path: true } });
  if (!step) return;

  const used = await prisma.pathStep.findMany({
    where: { pathId: step.pathId, NOT: { id: stepId } },
    select: { courseId: true },
  });
  const taken = new Set(used.map((row) => row.courseId).filter(Boolean) as string[]);

  const library = await pathLibrary();
  const replacement = library.find((course) => !taken.has(course.id));
  if (!replacement) return;

  await prisma.pathStep.update({
    where: { id: stepId },
    data: {
      courseId: replacement.id,
      title: `Week ${step.position} · ${replacement.title}`,
      detail: `${replacement.modules} modules · ${replacement.activities} activities · ${replacement.minutes} min · swapped in`,
      minutes: replacement.minutes,
      status: "not_started",
    },
  });

  revalidatePath("/path");
}

export async function startStepAction(formData: FormData): Promise<void> {
  const session = await getSession();
  const courseId = String(formData.get("courseId") ?? "");
  if (!courseId) redirect("/path");

  await enrollLearner(session.userId, courseId);
  revalidatePath("/learn");
  redirect(`/learn?course=${courseId}`);
}

export async function completeStepAction(formData: FormData): Promise<void> {
  const stepId = String(formData.get("stepId") ?? "");
  if (!stepId) return;
  await setPathStepStatus(stepId, "done");
  revalidatePath("/path");
}

export async function reopenStepAction(formData: FormData): Promise<void> {
  const stepId = String(formData.get("stepId") ?? "");
  if (!stepId) return;
  await setPathStepStatus(stepId, "not_started");
  revalidatePath("/path");
}

/** Used by the "start over" control on the path page. */
export async function clearPathAction(): Promise<void> {
  const session = await getSession();
  const path = await getLatestPath(session.userId);
  if (path) await prisma.learningPath.delete({ where: { id: path.id } });
  revalidatePath("/path");
}
