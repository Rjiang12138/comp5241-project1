"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { generateOutline, readSource, type SourceDoc } from "@/lib/generate";
import { SourceReadError } from "@/lib/source";
import { isEmptyMaterialPlaceholder, MAX_VISUAL_PAGES, parseVisualPages, validateStudioInput } from "@/lib/studio-input";
import { createCourseFromOutline, recordUnattachedAiRuns } from "@/lib/store";
import { checkOutline } from "@/lib/outline-quality";
import type { AiAuditEntry } from "@/lib/ai-audit";
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

async function retainUnattachedRuns(actorId: string, runs: AiAuditEntry[]): Promise<boolean> {
  if (!runs.length) return true;
  const rejected = runs.map((run) => run.outcome === "used" || run.outcome === "template"
    ? { ...run, outcome: "rejected" as const, metadata: { ...run.metadata, reason: "course_not_saved" } } : run);
  try {
    await recordUnattachedAiRuns(actorId, rejected);
    revalidatePath("/studio");
    return true;
  } catch {
    return false;
  }
}

export async function generateCourseAction(_previous: StudioState, formData: FormData): Promise<StudioState> {
  const session = await requireStaff();

  const title = String(formData.get("title") ?? "").trim();
  const brief = String(formData.get("brief") ?? "").trim();
  const includeVisuals = formData.get("includeVisuals") === "on";
  const visualPageRange = String(formData.get("visualPages") ?? "").trim();

  const rawAudience = String(formData.get("audience") ?? "mixed");
  const audience = rawAudience === "non_cs" || rawAudience === "cs" ? rawAudience : "mixed";

  const requested = Number(formData.get("minutes") ?? 45);
  const minutes = Number.isFinite(requested) ? Math.min(120, Math.max(15, Math.round(requested))) : 45;

  const entries = formData.getAll("material");
  if (entries.some((entry) => !(entry instanceof File))) {
    return {
      status: "error",
      message: "Choose source files using the material picker, or remove the upload and use the brief alone.",
    };
  }
  // Browsers submit an unnamed empty File when an optional picker is unused.
  // A named zero-byte file is a real selection and must report an error.
  const uploads = (entries as File[]).filter((entry) => !isEmptyMaterialPlaceholder(entry));
  const inputError = validateStudioInput({ title, brief, files: uploads, includeVisuals, visualPageRange });
  if (inputError) return { status: "error", message: inputError };
  const visualPages = parseVisualPages(visualPageRange).pages;

  const docs: SourceDoc[] = [];
  for (const upload of uploads) {
    try {
      docs.push(await readSource(upload, {
        includeVisuals,
        visualPages: visualPages.length > 0 ? visualPages : undefined,
        maxVisualPages: MAX_VISUAL_PAGES,
      }));
    } catch (error) {
      // Do not save a course that silently omits part of the selected material.
      const runs = [...docs.flatMap((doc) => doc.visual?.auditRuns ?? []), ...(error instanceof SourceReadError ? error.auditRuns : [])];
      const logged = await retainUnattachedRuns(session.userId, runs);
      return {
        status: "error",
        message: (error instanceof SourceReadError
          ? `${error.message} Remove or replace this file, then try again. No course was saved.`
          : `${upload.name}: could not read this file. Remove or replace it, then try again. No course was saved.`) +
          (logged ? "" : " The AI attempt record could not be saved."),
      };
    }
  }

  const outline = await generateOutline(docs, { minutes, audience, title, brief });

  if (outline.modules.length === 0) {
    const logged = await retainUnattachedRuns(session.userId, outline.auditRuns ?? []);
    return {
      status: "error",
      message: `No usable sections found. Add teaching text or describe the learning outcomes in the brief.${logged ? "" : " The AI attempt record could not be saved."}`,
    };
  }

  const qualityError = checkOutline(outline.modules, minutes, outline.template, docs.some((doc) => !!doc.visual));
  if (qualityError) {
    const logged = await retainUnattachedRuns(session.userId, outline.auditRuns ?? []);
    return { status: "error", message: `${qualityError} Please revise the material or try again. No course was saved.${logged ? "" : " The AI attempt record could not be saved."}` };
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
    message: docs.flatMap((doc) => doc.warnings ?? []).join(" ") || undefined,
  };
}
