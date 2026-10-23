"use server";

import { revalidatePath } from "next/cache";
import { assignInstructor, createCohort } from "@/lib/store";

/**
 * Admin mutations — the minimum the brief's third role needs: create a class,
 * and put a teacher in charge of it. Everything else (timetabling, enrolment
 * policy, cross-department reporting) is deliberately out of scope for this
 * iteration; see docs/requirements.md, gap 3.
 */

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function createCohortAction(formData: FormData): Promise<void> {
  const code = str(formData, "code");
  if (!code) return;
  await createCohort({
    code,
    name: str(formData, "name"),
    term: str(formData, "term"),
    instructorId: str(formData, "instructorId"),
  });
  revalidatePath("/admin");
  revalidatePath("/courses");
}

export async function assignInstructorAction(formData: FormData): Promise<void> {
  const cohortId = str(formData, "cohortId");
  const instructorId = str(formData, "instructorId");
  if (!cohortId || !instructorId) return;
  await assignInstructor(cohortId, instructorId);
  revalidatePath("/admin");
  revalidatePath("/courses");
}
