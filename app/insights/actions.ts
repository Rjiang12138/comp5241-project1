"use server";

import { requireStaff } from "@/lib/auth";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { courseAnalytics, nudgeLearner } from "@/lib/store";

/**
 * /insights writes exactly two things: a nudge, which is an event, and a
 * dismissal, which is a cookie.
 *
 * The dismissal is a cookie rather than a table because it is a preference of
 * the person looking, not a fact about the course. Storing it per course would
 * mean an instructor hiding an insight also hides it from their colleague.
 */

export async function nudgeAction(formData: FormData): Promise<void> {
  await requireStaff();
  const courseId = String(formData.get("courseId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  if (!courseId || !userId) return;
  await nudgeLearner(courseId, userId);
  revalidatePath("/insights");
}

/** Nudge everyone currently on the list — one event each, not a broadcast. */
export async function nudgeAllAction(formData: FormData): Promise<void> {
  await requireStaff();
  const courseId = String(formData.get("courseId") ?? "");
  if (!courseId) return;
  const analytics = await courseAnalytics(courseId, null);
  for (const row of analytics.nudge) {
    await nudgeLearner(courseId, row.userId);
  }
  revalidatePath("/insights");
}

export async function dismissInsightAction(formData: FormData): Promise<void> {
  await requireStaff();
  const courseId = String(formData.get("courseId") ?? "");
  const jar = await cookies();
  jar.set(`praxis_insight_${courseId}`, "dismissed", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  revalidatePath("/insights");
}

export async function restoreInsightAction(formData: FormData): Promise<void> {
  await requireStaff();
  const courseId = String(formData.get("courseId") ?? "");
  const jar = await cookies();
  jar.delete(`praxis_insight_${courseId}`);
  revalidatePath("/insights");
}
