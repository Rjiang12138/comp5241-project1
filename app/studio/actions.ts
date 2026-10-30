"use server";

import { revalidatePath } from "next/cache";
import { getSession, requireStaff } from "@/lib/auth";
import { generateOutline, readSource, type SourceDoc } from "@/lib/generate";
import { createCourseFromOutline } from "@/lib/store";
import type { StudioState } from "./state";

/**
 * Brief + uploaded material → a draft course, rendered back into the studio.
 *
 * It returns the outline instead of redirecting, because the prototype designed
 * this screen as three columns: brief on the left, the draft in the middle, the
 * generation log on the right. Redirecting to the editor would leave two thirds
 * of the screen permanently empty and turn the log into decoration.
 *
 * The course is persisted before the outline is returned, so the "Open in
 * editor" link is always live. Generating twice therefore creates two drafts,
 * which is what "Compare with last draft" implies the product allows.
 */

const MAX_BYTES = 12 * 1024 * 1024;

export async function generateCourseAction(_previous: StudioState, formData: FormData): Promise<StudioState> {
  await requireStaff();
  const session = await getSession();
  if (session.role === "learner") {
    return { status: "error", message: "Only instructors and admins can generate a course." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const brief = String(formData.get("brief") ?? "").trim();

  const rawAudience = String(formData.get("audience") ?? "mixed");
  const audience = rawAudience === "non_cs" || rawAudience === "cs" ? rawAudience : "mixed";

  const requested = Number(formData.get("minutes") ?? 45);
  const minutes = Number.isFinite(requested) ? Math.min(120, Math.max(15, Math.round(requested))) : 45;

  const uploads = formData
    .getAll("material")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0 && entry.size <= MAX_BYTES);

  if (uploads.length === 0 && brief.length < 20) {
    return {
      status: "error",
      message: "Add a source file, or write at least a sentence about what learners should be able to do.",
    };
  }

  const docs: SourceDoc[] = [];
  const rejected: string[] = [];
  for (const upload of uploads) {
    try {
      docs.push(await readSource(upload));
    } catch {
      // One unreadable deck should not throw away the other three.
      rejected.push(upload.name);
    }
  }

  // No material is a supported case, not an error: the brief is itself a source.
  if (docs.length === 0) {
    if (rejected.length > 0) {
      return {
        status: "error",
        message: `Could not read ${rejected.join(", ")}. Text-based PDFs work; scans need OCR.`,
      };
    }
    docs.push({ name: "brief.md", pages: 1, text: brief });
  }

  const outline = await generateOutline(docs, { minutes, audience, title, brief });

  if (outline.modules.length === 0) {
    return {
      status: "error",
      message: "No sections found in that material. A slide deck with titles works better than a scanned PDF.",
    };
  }

  const courseId = await createCourseFromOutline({
    title: title || "Untitled course",
    brief,
    audience,
    minutes,
    ownerId: session.userId,
    model: outline.model,
    outline,
  });

  revalidatePath("/courses");
  revalidatePath("/studio");

  return {
    status: "ok",
    outline,
    courseId,
    message: rejected.length > 0 ? `Skipped ${rejected.join(", ")} — could not read them.` : undefined,
  };
}
