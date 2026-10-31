"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { PREVIEW_COOKIE, enrollLearner, nextPreviewLearner, previewLearner, recordEvent } from "@/lib/store";
import { contentFor } from "@/lib/activity-content";

/**
 * The player's writes.
 *
 * Every one of them appends to `events` and nothing else. Progress is a query,
 * not a column, so there is no counter to keep in sync and no way for the
 * player and the analytics screen to disagree about what happened.
 *
 * The actions take an explicit `enrollmentId` rather than deriving it from the
 * session, because an instructor previewing a course is writing into a
 * learner's log on purpose. The check is that the enrolment exists and belongs
 * to the course being played — not that the caller owns it.
 */

async function verify(enrollmentId: string, courseId: string): Promise<{ id: string; userId: string } | null> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { id: true, userId: true, courseId: true },
  });
  if (!enrollment || enrollment.courseId !== courseId) return null;
  return { id: enrollment.id, userId: enrollment.userId };
}

function refresh(courseId: string): void {
  revalidatePath("/learn");
  revalidatePath("/insights");
  revalidatePath(`/courses/${courseId}`);
}

export async function completeActivityAction(input: {
  enrollmentId: string;
  activityId: string;
  courseId: string;
  /** What the learner produced, kept in the log so a reviewer can see it. */
  response?: string;
  score?: { correct: number; total: number };
  /**
   * Where to go after saving. The redirect happens here, on the server, because
   * a client-side `router.push` immediately after the action loses the race
   * against the refresh the action triggers — the learner stayed on the
   * activity they had just finished while its button turned into "Completed".
   */
  nextActivityId?: string | null;
}): Promise<{ ok: boolean }> {
  const enrollment = await verify(input.enrollmentId, input.courseId);
  if (!enrollment) return { ok: false };

  await recordEvent({
    enrollmentId: enrollment.id,
    activityId: input.activityId,
    type: "activity_completed",
    payload: {
      ...(input.score ? { correct: input.score.correct, total: input.score.total } : {}),
      ...(input.response ? { response: input.response.slice(0, 2000) } : {}),
    },
  });

  refresh(input.courseId);
  if (input.nextActivityId) redirect(`/learn?course=${input.courseId}&activity=${input.nextActivityId}`);
  return { ok: true };
}

export async function recordAttemptAction(input: {
  enrollmentId: string;
  activityId: string;
  courseId: string;
  passed?: number;
  total?: number;
  kind?: "attempt" | "hint";
}): Promise<{ ok: boolean }> {
  const enrollment = await verify(input.enrollmentId, input.courseId);
  if (!enrollment) return { ok: false };

  await recordEvent({
    enrollmentId: enrollment.id,
    activityId: input.activityId,
    type: input.kind === "hint" ? "hint_opened" : "activity_attempted",
    payload: { passed: input.passed ?? 0, total: input.total ?? 0 },
  });

  refresh(input.courseId);
  return { ok: true };
}

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "do", "does", "did", "why", "what", "how", "when",
  "which", "who", "can", "could", "should", "would", "i", "you", "it", "this", "that", "of", "to",
  "in", "on", "for", "and", "or", "not", "my", "me", "we", "be", "have", "has", "with", "about",
]);

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

/**
 * The tutor: answers from this activity's material, or refuses.
 *
 * There is no retrieval index here and pretending otherwise would be the
 * dishonest version of this feature. What it does is check whether the question
 * shares vocabulary with the material; if it does, it returns the most relevant
 * paragraph and cites it. If it does not, it says it does not know — which is
 * the behaviour the UI promises, and the one the AI-fluency log argues for.
 */
export async function askTutorAction(input: {
  enrollmentId: string;
  activityId: string;
  courseId: string;
  question: string;
}): Promise<{ answer: string; grounded: boolean; source: string }> {
  const enrollment = await verify(input.enrollmentId, input.courseId);
  const question = input.question.trim();
  if (!enrollment || question.length < 3) {
    return { answer: "Ask a question about this activity and I will look in the material.", grounded: false, source: "" };
  }

  const activity = await prisma.activity.findUnique({
    where: { id: input.activityId },
    include: { module: { include: { course: true } } },
  });

  await recordEvent({
    enrollmentId: enrollment.id,
    activityId: input.activityId,
    type: "tutor_asked",
    payload: { question: question.slice(0, 300) },
  });
  refresh(input.courseId);

  if (!activity) {
    return { answer: "I cannot find this activity.", grounded: false, source: "" };
  }

  const content = contentFor(
    { id: activity.id, title: activity.title, format: activity.format, payload: activity.payload },
    { title: activity.module.title, objective: activity.module.objective },
    { title: activity.module.course.title, brief: activity.module.course.brief },
  );

  // Flatten whatever shape the content is into citable passages.
  const passages: Array<{ text: string; source: string }> = [];
  if (content.kind === "reading") {
    content.blocks.forEach((block, index) =>
      passages.push({
        text: block.text,
        source: `${activity.module.title}${block.heading ? ` · ${block.heading}` : ` · ¶${index + 1}`}`,
      }),
    );
  } else if (content.kind === "quiz") {
    content.questions.forEach((question2, index) =>
      passages.push({ text: `${question2.prompt} ${question2.explain}`, source: `Quiz Q${index + 1}` }),
    );
  } else if (content.kind === "code_lab") {
    passages.push({ text: `${content.brief} ${content.task.join(" ")}`, source: "Lab brief" });
    passages.push({ text: content.hint, source: "Hint ladder" });
  } else if (content.kind === "role_play") {
    passages.push({ text: `${content.scenario} ${content.rubric.join(" ")}`, source: "Scenario and rubric" });
  } else if (content.kind === "simulation") {
    content.options.forEach((option) =>
      passages.push({ text: `${option.label} — ${option.outcome}`, source: "Consequences" }),
    );
  } else if (content.kind === "peer_review") {
    content.findings.forEach((finding) => passages.push({ text: finding.note, source: "Review notes" }));
  } else {
    passages.push({ text: content.prompt, source: "Reflection prompt" });
  }

  const query = words(question);
  const scored = passages
    .map((passage) => {
      const haystack = words(passage.text);
      const overlap = query.filter((word) => haystack.some((candidate) => candidate.startsWith(word.slice(0, 5)))).length;
      return { ...passage, overlap };
    })
    .sort((a, b) => b.overlap - a.overlap);

  const best = scored[0];
  if (!best || best.overlap === 0) {
    return {
      answer:
        "That is not something this activity covers, so I will not guess. The material here is about " +
        `${activity.module.objective.toLowerCase()} — try a question in those terms, or ask your instructor.`,
      grounded: false,
      source: "no passage in this activity matched the question",
    };
  }

  return {
    answer: best.text,
    grounded: true,
    source: `${activity.module.title} · ${best.source}`,
  };
}

export async function enrollAction(formData: FormData): Promise<void> {
  const session = await getSession();
  const courseId = String(formData.get("courseId") ?? "");
  if (!courseId) redirect("/learn");

  // A staff session previewing a course enrols the learner being previewed, so
  // "preview as learner" is a real run of the course rather than a puppet show.
  const target = String(formData.get("userId") ?? "") || session.userId;
  const user = await prisma.user.findUnique({ where: { id: target }, select: { id: true } });
  const userId = user?.id ?? session.userId;

  await enrollLearner(userId, courseId);
  revalidatePath("/learn");
  redirect(`/learn?course=${courseId}`);
}

/**
 * Move the instructor's preview to the next enrolled learner.
 *
 * The pin lives in a cookie so the choice survives the save the instructor is
 * about to make. Picking on the fly instead meant the banner changed identity
 * every time an activity was completed, which reads as a bug rather than as a
 * feature.
 */
export async function cyclePreviewAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (session.role === "learner") redirect("/learn");

  const courseId = String(formData.get("courseId") ?? "");
  if (!courseId) redirect("/learn");

  const jar = await cookies();
  const current = jar.get(PREVIEW_COOKIE)?.value ?? (await previewLearner(courseId)) ?? "";
  const next = await nextPreviewLearner(courseId, current);

  if (next) {
    jar.set(PREVIEW_COOKIE, next, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
  }

  revalidatePath("/learn");
  redirect(`/learn?course=${courseId}`);
}
