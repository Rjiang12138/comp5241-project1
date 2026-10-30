import type { GeneratedOutline } from "@/lib/generate";

/**
 * The shape the studio form hands back to the page.
 *
 * It lives in its own module because a `"use server"` file may only export
 * async functions — a type and a constant cannot sit next to the action that
 * consumes them.
 */
export type StudioState = {
  status: "idle" | "error" | "ok";
  /** Shown under the Generate button when status is "error". */
  message?: string;
  outline?: GeneratedOutline;
  /** Set once the draft has been written, so the editor is one click away. */
  courseId?: string;
};

export const initialStudioState: StudioState = { status: "idle" };
