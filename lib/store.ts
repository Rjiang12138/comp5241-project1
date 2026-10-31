import { prisma } from "./db";
import type { Prisma } from "@prisma/client";
import type { GeneratedOutline } from "./generate";
import { authorContent } from "./author";
import { hasAuthoredContent } from "./activity-content";
import type {
  Activity,
  ActivityFormat,
  Background,
  Cohort,
  Course,
  CourseView,
  Module,
  User,
} from "./types";

/**
 * Data access — Postgres on Neon, through Prisma.
 *
 * This is the only module that knows where rows come from. Pages and server
 * actions speak these signatures, which is why moving from the week 8 in-memory
 * store to a real database did not change a single screen.
 *
 * Reads are async now. They were synchronous when the data lived in a JSON file;
 * pretending otherwise across a network round trip would mean the UI lying about
 * when data exists.
 */

const dateOnly = (value: Date): string => value.toISOString().slice(0, 10);

export async function listCourses(): Promise<
  Array<Course & { moduleCount: number; activityCount: number; owner: User | undefined }>
> {
  const rows = await prisma.course.findMany({
    include: {
      owner: true,
      modules: { select: { id: true, activities: { select: { id: true } } } },
    },
    orderBy: { title: "asc" },
  });

  return rows.map((row) => ({
    ...row,
    moduleCount: row.modules.length,
    activityCount: row.modules.reduce((sum, module) => sum + module.activities.length, 0),
    owner: row.owner ?? undefined,
  }));
}

export async function getCourse(courseId: string): Promise<CourseView | null> {
  const row = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { position: "asc" },
        include: { activities: { orderBy: { position: "asc" } } },
      },
      cohort: true,
      versions: { orderBy: { version: "desc" } },
      enrollments: { include: { user: true } },
    },
  });

  if (!row) return null;

  return {
    ...row,
    cohort: row.cohort ? { ...row.cohort, createdAt: dateOnly(row.cohort.createdAt) } : null,
    learners: row.enrollments.map((enrollment) => enrollment.user),
    versions: row.versions.map((version) => ({
      ...version,
      createdAt: dateOnly(version.createdAt),
    })),
  };
}

/** Published versions of a course, newest first, with the tree as it stood. */
export async function courseVersions(courseId: string): Promise<
  Array<{ id: string; version: number; note: string; createdAt: string; snapshot: unknown }>
> {
  const rows = await prisma.courseVersion.findMany({
    where: { courseId },
    orderBy: { version: "desc" },
  });
  return rows.map((row) => ({
    id: row.id,
    version: row.version,
    note: row.note,
    createdAt: dateOnly(row.createdAt),
    snapshot: row.snapshot,
  }));
}

/** The most recent course this instructor touched, for the studio's status pill. */
export async function lastTouchedCourse(ownerId: string): Promise<{ id: string; title: string; status: string; updatedAt: Date } | null> {
  const row = await prisma.course.findFirst({
    where: { ownerId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, status: true, updatedAt: true },
  });
  return row ?? null;
}

export async function courseMinutes(courseId: string): Promise<number> {
  const result = await prisma.activity.aggregate({
    where: { module: { courseId } },
    _sum: { minutes: true },
  });
  return result._sum.minutes ?? 0;
}

export async function listInstructors(): Promise<User[]> {
  return prisma.user.findMany({ where: { role: "instructor" }, orderBy: { name: "asc" } });
}

/** Everyone who can sign in to the staff side of the app. */
export async function listStaff(): Promise<User[]> {
  return prisma.user.findMany({
    where: { role: { in: ["instructor", "admin"] } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}

export async function listCohorts(): Promise<
  Array<Cohort & { instructor: User | undefined; learnerCount: number; courseCount: number }>
> {
  const rows = await prisma.cohort.findMany({
    include: {
      instructor: true,
      _count: { select: { enrollments: true, courses: true } },
    },
    orderBy: { code: "asc" },
  });

  return rows.map((row) => ({
    ...row,
    createdAt: dateOnly(row.createdAt),
    instructor: row.instructor ?? undefined,
    learnerCount: row._count.enrollments,
    courseCount: row._count.courses,
  }));
}

export async function getCohort(cohortId: string) {
  const cohorts = await listCohorts();
  return cohorts.find((cohort) => cohort.id === cohortId) ?? null;
}

/* ------------------------------------------------------------------ write */

export async function updateCourse(
  courseId: string,
  patch: Partial<Pick<Course, "title" | "brief" | "audience" | "minutes" | "status">>,
): Promise<void> {
  await prisma.course.update({ where: { id: courseId }, data: patch });
}

export async function addModule(courseId: string, title: string): Promise<void> {
  const last = await prisma.module.aggregate({ where: { courseId }, _max: { position: true } });
  await prisma.module.create({
    data: {
      courseId,
      position: (last._max.position ?? 0) + 1,
      title: title.trim() || "Untitled module",
      objective: "",
      estimatedMinutes: 10,
    },
  });
}

export async function updateModule(
  moduleId: string,
  patch: Partial<Pick<Module, "title" | "objective" | "estimatedMinutes">>,
): Promise<void> {
  await prisma.module.update({ where: { id: moduleId }, data: patch });
}

export async function removeModule(moduleId: string): Promise<void> {
  const module = await prisma.module.findUnique({ where: { id: moduleId } });
  if (!module) return;

  await prisma.$transaction(async (tx) => {
    await tx.module.delete({ where: { id: moduleId } }); // activities cascade
    const remaining = await tx.module.findMany({
      where: { courseId: module.courseId },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    // Two passes: unique(courseId, position) would collide if a row moved onto a
    // position another row had not vacated yet.
    for (const [index, row] of remaining.entries()) {
      await tx.module.update({ where: { id: row.id }, data: { position: -(index + 1) } });
    }
    for (const [index, row] of remaining.entries()) {
      await tx.module.update({ where: { id: row.id }, data: { position: index + 1 } });
    }
  }, { timeout: 15_000 });
}

export async function moveModule(moduleId: string, direction: -1 | 1): Promise<void> {
  const module = await prisma.module.findUnique({ where: { id: moduleId } });
  if (!module) return;

  const siblings = await prisma.module.findMany({
    where: { courseId: module.courseId },
    orderBy: { position: "asc" },
    select: { id: true, position: true },
  });

  const index = siblings.findIndex((row) => row.id === moduleId);
  const neighbour = siblings[index + direction];
  if (!neighbour) return;

  await prisma.$transaction([
    prisma.module.update({ where: { id: module.id }, data: { position: -1 } }),
    prisma.module.update({ where: { id: neighbour.id }, data: { position: module.position } }),
    prisma.module.update({ where: { id: module.id }, data: { position: neighbour.position } }),
  ]);
}

export async function addActivity(moduleId: string, title: string, format: ActivityFormat): Promise<void> {
  const last = await prisma.activity.aggregate({ where: { moduleId }, _max: { position: true } });
  await prisma.activity.create({
    data: {
      moduleId,
      position: (last._max.position ?? 0) + 1,
      title: title.trim() || "Untitled activity",
      format,
      minutes: 8,
    },
  });
}

export async function updateActivity(
  activityId: string,
  patch: Partial<Pick<Activity, "title" | "format" | "minutes">>,
): Promise<void> {
  await prisma.activity.update({ where: { id: activityId }, data: patch });
}

export async function removeActivity(activityId: string): Promise<void> {
  const activity = await prisma.activity.findUnique({ where: { id: activityId } });
  if (!activity) return;

  await prisma.$transaction(async (tx) => {
    await tx.activity.delete({ where: { id: activityId } });
    const remaining = await tx.activity.findMany({
      where: { moduleId: activity.moduleId },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    for (const [index, row] of remaining.entries()) {
      await tx.activity.update({ where: { id: row.id }, data: { position: -(index + 1) } });
    }
    for (const [index, row] of remaining.entries()) {
      await tx.activity.update({ where: { id: row.id }, data: { position: index + 1 } });
    }
  }, { timeout: 15_000 });
}

/** Publishing is a gate, not a toggle: it records a version row every time. */
/**
 * Write activity bodies for a course that has none.
 *
 * Courses generated before the authoring step existed have structure and no
 * content: their activities fall through to `contentFor`'s generic template,
 * which is why every one of them asks "which statement about <module> is
 * defensible". The source deck is long gone by now, so this fills from what the
 * course still holds — the module objective, which the instructor wrote or
 * approved — rather than pretending to quote material it cannot see.
 *
 * Hand-authored activities are skipped: their content lives in
 * `activity-content.ts` and a payload would only shadow it.
 */
export async function fillActivityContent(courseId: string): Promise<number> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      title: true,
      modules: {
        orderBy: { position: "asc" },
        select: {
          title: true,
          objective: true,
          activities: { select: { id: true, title: true, format: true, payload: true } },
        },
      },
    },
  });
  if (!course) return 0;

  const objectives = course.modules.map((module) => module.objective);
  let written = 0;

  for (const module of course.modules) {
    for (const activity of module.activities) {
      if (activity.payload || hasAuthoredContent(activity.id)) continue;

      const payload = authorContent({
        format: activity.format,
        title: activity.title,
        moduleTitle: module.title,
        objective: module.objective,
        courseTitle: course.title,
        section: null,
        siblings: objectives.filter((objective) => objective !== module.objective),
      });

      await prisma.activity.update({
        where: { id: activity.id },
        data: { payload: payload as unknown as Prisma.InputJsonValue },
      });
      written += 1;
    }
  }

  return written;
}

export async function publishCourse(courseId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const current = await tx.course.findUnique({
      where: { id: courseId },
      select: {
        title: true,
        brief: true,
        minutes: true,
        audience: true,
        modules: {
          orderBy: { position: "asc" },
          select: {
            title: true,
            objective: true,
            activities: {
              orderBy: { position: "asc" },
              select: { title: true, format: true, minutes: true },
            },
          },
        },
      },
    });

    const course = await tx.course.update({
      where: { id: courseId },
      data: { version: { increment: 1 }, status: "published" },
      select: { version: true },
    });

    await tx.courseVersion.create({
      data: {
        courseId,
        version: course.version,
        note: "Published from the course editor",
        // The tree as it stood at publish time. Without it "compare v3 → v4"
        // could only compare two sentences the instructor wrote about the
        // change, which is a note, not a diff.
        snapshot: current ? (current as unknown as Prisma.InputJsonValue) : undefined,
      },
    });
  }, { timeout: 15_000 });
}

export async function createCohort(input: {
  code: string;
  name: string;
  term: string;
  instructorId: string;
}): Promise<void> {
  await prisma.cohort.create({
    data: {
      code: input.code.trim() || "UNTITLED",
      name: input.name.trim() || input.code.trim() || "Untitled cohort",
      term: input.term.trim() || "2026/27 S1",
      instructorId: input.instructorId,
    },
  });
}

export async function assignInstructor(cohortId: string, instructorId: string): Promise<void> {
  await prisma.cohort.update({ where: { id: cohortId }, data: { instructorId } });
}

/**
 * Persist a generated outline as a draft course and return its id.
 *
 * One transaction, because a course with no modules is a row the editor cannot
 * render and a module with no activities is a screen the instructor has to
 * repair by hand. The `ai_runs` row is written in the same transaction so the
 * audit trail cannot drift from the artefact it describes — the brief asks for a
 * generation log that survives the session, not a `console.log`.
 */
export async function createCourseFromOutline(input: {
  title: string;
  brief: string;
  audience: "non_cs" | "cs" | "mixed";
  minutes: number;
  ownerId: string;
  model: string;
  outline: GeneratedOutline;
}): Promise<string> {
  // One nested write, not a loop inside an interactive transaction.
  //
  // The first version created the course, then each module, then each activity,
  // then the AiRun — seventeen sequential round trips to a database in another
  // region. Prisma's interactive transactions default to a five-second budget,
  // and the tree took longer than that to write, so "Generate outline" answered
  // 500 with P2028 while the draft was half-inserted. A nested create sends the
  // same graph in one call: it is atomic without holding a transaction open
  // across a dozen network hops.
  const course = await prisma.course.create({
    data: {
      title: input.title.trim() || "Untitled course",
      brief: input.brief,
      audience: input.audience,
      minutes: input.minutes,
      ownerId: input.ownerId,
      status: "draft",
      modules: {
        create: input.outline.modules.map((module, moduleIndex) => ({
          position: moduleIndex + 1,
          title: module.title,
          objective: module.objective,
          estimatedMinutes: module.estimatedMinutes,
          activities: {
            create: module.activities.map((activity, activityIndex) => ({
              position: activityIndex + 1,
              title: activity.title,
              format: activity.format,
              minutes: activity.minutes,
              // The body the generator wrote from the source section. Storing it
              // is what makes the course a course rather than an outline that
              // `contentFor` dresses up at render time.
              payload: activity.payload ? (activity.payload as unknown as Prisma.InputJsonValue) : undefined,
            })),
          },
        })),
      },
      aiRuns: {
        create: {
          purpose: "outline",
          // Which prompt produced this draft, so a later audit can tell a model
          // draft from a template one without reading the course itself.
          promptVersion: input.outline.template ? "template-v1" : "outline-json-v1",
          model: input.model,
          latencyMs: input.outline.steps.reduce((sum, step) => sum + step.ms, 0),
          acceptedBy: input.ownerId,
        },
      },
    },
    select: { id: true },
  });

  return course.id;
}

/* --------------------------------------------------------------- learner */

/** Event types written by the player. Kept as strings so the log can grow. */
export type EventType =
  | "activity_started"
  | "activity_completed"
  | "activity_attempted"
  | "hint_opened"
  | "tutor_asked"
  | "nudge_sent";

export type LearnerCourse = { id: string; title: string; minutes: number };

export type LearnerView = {
  learner: User;
  enrollmentId: string;
  course: Course & { modules: Array<Module & { activities: Activity[] }> };
  /** Activity ids this learner has finished, oldest first. */
  completed: string[];
  /** Attempts per activity id, counted from the event log. */
  attempts: Record<string, number>;
  /** Where to resume: the first unfinished activity; null once the course is done. */
  currentActivityId: string | null;
  totalActivities: number;
  totalMinutes: number;
  courses: LearnerCourse[];
  lastActiveAt: Date | null;
};

/**
 * Everything the player needs, in one round trip per table.
 *
 * Progress is derived from `events`, never stored on the enrolment: the log is
 * the source of truth and a denormalised counter would be a second one that
 * can disagree with it.
 */
export async function getLearnerView(userId: string, courseId?: string): Promise<LearnerView | null> {
  const enrolments = await prisma.enrollment.findMany({
    where: { userId },
    include: { course: { select: { id: true, title: true, minutes: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (enrolments.length === 0) return null;

  const chosen = (courseId ? enrolments.find((row) => row.courseId === courseId) : undefined) ?? enrolments[0];

  const [learner, course, events] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.course.findUnique({
      where: { id: chosen.courseId },
      include: {
        modules: {
          orderBy: { position: "asc" },
          include: { activities: { orderBy: { position: "asc" } } },
        },
      },
    }),
    prisma.event.findMany({
      where: { enrollmentId: chosen.id },
      orderBy: { createdAt: "asc" },
      select: { activityId: true, type: true, createdAt: true },
    }),
  ]);

  if (!learner || !course) return null;

  const completed: string[] = [];
  const attempts: Record<string, number> = {};
  for (const event of events) {
    if (!event.activityId) continue;
    if (event.type === "activity_completed" && !completed.includes(event.activityId)) {
      completed.push(event.activityId);
    }
    if (event.type === "activity_attempted") {
      attempts[event.activityId] = (attempts[event.activityId] ?? 0) + 1;
    }
  }

  const ordered = course.modules.flatMap((module) => module.activities.map((activity) => activity.id));
  // `null` when everything is finished. Falling back to the last activity is how
  // a learner who had completed a course kept landing on its final quiz with a
  // greyed-out "Completed" button and no way forward.
  const currentActivityId = ordered.find((id) => !completed.includes(id)) ?? null;

  return {
    learner,
    enrollmentId: chosen.id,
    course,
    completed,
    attempts,
    currentActivityId,
    totalActivities: ordered.length,
    totalMinutes: course.modules.reduce(
      (sum, module) => sum + module.activities.reduce((inner, activity) => inner + activity.minutes, 0),
      0,
    ),
    courses: enrolments.map((row) => ({ id: row.course.id, title: row.course.title, minutes: row.course.minutes })),
    lastActiveAt: events.length > 0 ? events[events.length - 1].createdAt : null,
  };
}

export type CourseProgress = { completed: number; total: number; minutesDone: number };

/**
 * How far one person is through each course they are enrolled in.
 *
 * `/path` needs this per step. It used to print a hard-coded 40% on whichever
 * step was "you are here" — a number inherited from the prototype that was true
 * of nothing. A learner who had finished all seven activities of a course still
 * saw 40% on the step that pointed at it.
 */
export async function learnerCourseProgress(userId: string): Promise<Record<string, CourseProgress>> {
  const enrolments = await prisma.enrollment.findMany({
    where: { userId },
    select: {
      id: true,
      courseId: true,
      course: {
        select: {
          modules: { select: { activities: { select: { id: true, minutes: true } } } },
        },
      },
    },
  });
  if (enrolments.length === 0) return {};

  const done = await prisma.event.findMany({
    where: {
      enrollmentId: { in: enrolments.map((row) => row.id) },
      type: "activity_completed",
    },
    select: { enrollmentId: true, activityId: true },
  });

  const byEnrolment = new Map<string, Set<string>>();
  for (const event of done) {
    if (!event.activityId) continue;
    const set = byEnrolment.get(event.enrollmentId) ?? new Set<string>();
    set.add(event.activityId);
    byEnrolment.set(event.enrollmentId, set);
  }

  const out: Record<string, CourseProgress> = {};
  for (const enrolment of enrolments) {
    const activities = enrolment.course.modules.flatMap((module) => module.activities);
    const finished = byEnrolment.get(enrolment.id) ?? new Set<string>();
    out[enrolment.courseId] = {
      completed: activities.filter((activity) => finished.has(activity.id)).length,
      total: activities.length,
      minutesDone: activities.filter((activity) => finished.has(activity.id)).reduce((sum, activity) => sum + activity.minutes, 0),
    };
  }
  return out;
}

/** Append one row to the event log. Nothing in the app ever updates one. */
export async function recordEvent(input: {
  enrollmentId: string;
  activityId: string | null;
  type: EventType;
  payload?: Record<string, unknown>;
}): Promise<void> {
  await prisma.event.create({
    data: {
      enrollmentId: input.enrollmentId,
      activityId: input.activityId,
      type: input.type,
      payload: (input.payload ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

/**
 * Log that an activity was opened.
 *
 * Idempotent on purpose: the player is a page, and pages get reloaded, shared
 * and re-entered from the browser history. Writing a `started` row per request
 * would inflate the denominator of every "time on task" figure in /insights and
 * make a learner who refreshed three times look like three learners. One row per
 * (enrolment, activity) is the fact worth keeping: this person did open it.
 */
export async function recordStart(enrollmentId: string, activityId: string): Promise<void> {
  const existing = await prisma.event.findFirst({
    where: { enrollmentId, activityId, type: "activity_started" },
    select: { id: true },
  });
  if (existing) return;
  await recordEvent({ enrollmentId, activityId, type: "activity_started" });
}

/**
 * Enrol a learner in a course.
 *
 * `Enrollment.cohortId` is required by the schema because a cohort is who the
 * instructor reports on. A self-directed learner has no cohort, so they join
 * the course's own cohort when it has one and the earliest cohort otherwise —
 * a real product would have a "self-paced" cohort, and that is the change to
 * make here rather than loosening the constraint.
 */
export async function enrollLearner(userId: string, courseId: string): Promise<void> {
  const existing = await prisma.enrollment.findUnique({ where: { courseId_userId: { courseId, userId } } });
  if (existing) return;

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { cohortId: true } });
  const cohortId =
    course?.cohortId ?? (await prisma.cohort.findFirst({ orderBy: { code: "asc" }, select: { id: true } }))?.id;
  if (!cohortId) throw new Error("No cohort exists to enrol into");

  await prisma.enrollment.create({ data: { courseId, userId, cohortId, importedFrom: "manual" } });
}

/**
 * Add a list of people to a course, creating the ones who do not exist yet.
 *
 * Returns how many enrolments were created, which is the only number worth
 * showing: "12 added, 3 already enrolled" is a result, "import complete" is not.
 * `importedFrom` is set to `csv` so the roster table can say where a row came
 * from later.
 */
export async function importRoster(courseId: string, rows: Array<{ name: string; email: string }>): Promise<number> {
  if (rows.length === 0) return 0;

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { cohortId: true } });
  const cohortId =
    course?.cohortId ?? (await prisma.cohort.findFirst({ orderBy: { code: "asc" }, select: { id: true } }))?.id;
  if (!cohortId) return 0;

  let added = 0;
  for (const row of rows) {
    const user = await prisma.user.upsert({
      where: { email: row.email },
      update: {},
      create: { name: row.name, email: row.email, role: "learner", background: "non_cs" },
      select: { id: true },
    });

    const existing = await prisma.enrollment.findUnique({
      where: { courseId_userId: { courseId, userId: user.id } },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.enrollment.create({
      data: { courseId, userId: user.id, cohortId, importedFrom: "csv" },
    });
    added += 1;
  }

  return added;
}

/** Published courses a learner could join. */
export async function listPublishedCourses(): Promise<Array<{ id: string; title: string; minutes: number; modules: number }>> {
  const rows = await prisma.course.findMany({
    where: { status: "published" },
    orderBy: { title: "asc" },
    include: { _count: { select: { modules: true } } },
  });
  return rows.map((row) => ({ id: row.id, title: row.title, minutes: row.minutes, modules: row._count.modules }));
}

/* ------------------------------------------------------------- analytics */

export type WeeklyPoint = { label: string; value: number };

export type FormatCompletion = { format: ActivityFormat; label: string; pct: number; attempts: number };

export type NudgeRow = {
  userId: string;
  name: string;
  background: Background;
  completed: number;
  total: number;
  lastActive: Date | null;
  signal: string;
  tone: "rose" | "amber";
};

export type CourseAnalytics = {
  learners: number;
  activeThisWeek: number;
  /** Share of the cohort who finished every activity. */
  completionRate: number;
  /** Mean per-learner progress. The headline number, because 8% "finished
   *  everything" is true but reads as broken when the cohort is mid-course. */
  averageProgress: number;
  finishedAll: number;
  medianAttempts: number;
  tutorQuestions: number;
  weekly: WeeklyPoint[];
  byFormat: FormatCompletion[];
  insight: { headline: string; body: string; activityTitle: string | null } | null;
  nudge: NudgeRow[];
  rangeDays: number | null;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

/**
 * Everything /insights shows, computed from the event log.
 *
 * Nothing here is a stored counter. If the numbers look wrong, the events are
 * wrong, and there is exactly one place to look — which is the property that
 * makes an analytics screen worth trusting.
 */
export async function courseAnalytics(courseId: string, rangeDays: number | null): Promise<CourseAnalytics> {
  const [enrolments, activities] = await Promise.all([
    prisma.enrollment.findMany({
      where: { courseId },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.activity.findMany({
      where: { module: { courseId } },
      orderBy: [{ module: { position: "asc" } }, { position: "asc" }],
      select: { id: true, title: true, format: true, module: { select: { position: true } } },
    }),
  ]);

  const enrollmentIds = enrolments.map((row) => row.id);
  const since = rangeDays ? new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000) : null;

  /**
   * One read of everything, then two views of it.
   *
   * Progress is a state — "Mei has finished 7 of 7" — and a state does not reset
   * because the instructor picked "last 7 days". Attempts and tutor questions are
   * events, and those do belong to the window. Reading only windowed rows made
   * the 7-day view claim "0 of 24 finished every activity", which is false about
   * the learners and reads as a regression that never happened.
   */
  const allEvents = await prisma.event.findMany({
    where: { enrollmentId: { in: enrollmentIds } },
    orderBy: { createdAt: "asc" },
    select: { enrollmentId: true, activityId: true, type: true, createdAt: true },
  });
  const events = since ? allEvents.filter((event) => event.createdAt >= since) : allEvents;

  const completedByEnrolment = new Map<string, Set<string>>();
  // Keyed by enrolment + activity: a median over the whole course would count
  // one learner retrying eight times as eight different attempts.
  const attemptsPerActivity = new Map<string, number>();
  const lastActive = new Map<string, Date>();
  const attemptEventsByActivity = new Map<string, number>();
  let tutorQuestions = 0;

  for (const event of allEvents) {
    if (event.type === "activity_completed" && event.activityId) {
      const set = completedByEnrolment.get(event.enrollmentId) ?? new Set<string>();
      set.add(event.activityId);
      completedByEnrolment.set(event.enrollmentId, set);
    }

    // Last-seen is a property of the person, not of the selected range.
    const previous = lastActive.get(event.enrollmentId);
    if (!previous || event.createdAt > previous) lastActive.set(event.enrollmentId, event.createdAt);
  }

  for (const event of events) {
    if (event.type === "activity_attempted" && event.activityId) {
      const key = `${event.enrollmentId}:${event.activityId}`;
      attemptsPerActivity.set(key, (attemptsPerActivity.get(key) ?? 0) + 1);
      attemptEventsByActivity.set(event.activityId, (attemptEventsByActivity.get(event.activityId) ?? 0) + 1);
    }
    if (event.type === "tutor_asked") tutorQuestions += 1;
  }

  const total = activities.length;
  const finished = [...completedByEnrolment.values()].filter((set) => set.size >= total && total > 0).length;
  const progressSum = enrolments.reduce(
    (sum, enrolment) => sum + Math.min(total, completedByEnrolment.get(enrolment.id)?.size ?? 0),
    0,
  );
  const averageProgress = enrolments.length === 0 || total === 0 ? 0 : Math.round((progressSum / (enrolments.length * total)) * 100);

  // Eight weekly buckets ending this week, so the chart has a fixed shape
  // whether or not the range filter is set to 7 days.
  const now = Date.now();
  const weekly: WeeklyPoint[] = [];
  for (let index = 7; index >= 0; index -= 1) {
    const end = now - index * WEEK_MS;
    const start = end - WEEK_MS;
    const active = new Set(
      events
        .filter((event) => {
          const time = event.createdAt.getTime();
          return time > start && time <= end;
        })
        .map((event) => event.enrollmentId),
    );
    weekly.push({
      label: `W${8 - index}`,
      value: enrolments.length === 0 ? 0 : Math.round((active.size / enrolments.length) * 100),
    });
  }

  const formatLabels: Record<string, string> = {
    reading: "Reading",
    quiz: "Quiz",
    role_play: "Role play",
    code_lab: "Code lab",
    simulation: "Simulation",
    peer_review: "Peer review",
    game: "Mini-game",
    narrated_slides: "Narrated slides",
  };

  const byFormat: FormatCompletion[] = [];
  for (const [format, label] of Object.entries(formatLabels)) {
    const inFormat = activities.filter((activity) => activity.format === format);
    if (inFormat.length === 0) continue;
    let done = 0;
    let possible = 0;
    for (const enrolment of enrolments) {
      const set = completedByEnrolment.get(enrolment.id);
      for (const activity of inFormat) {
        possible += 1;
        if (set?.has(activity.id)) done += 1;
      }
    }
    const attempts = inFormat.reduce((sum, activity) => sum + (attemptEventsByActivity.get(activity.id) ?? 0), 0);
    byFormat.push({
      format: format as ActivityFormat,
      label,
      pct: possible === 0 ? 0 : Math.round((done / possible) * 100),
      attempts,
    });
  }
  byFormat.sort((a, b) => b.pct - a.pct);

  // The nudge list: least progress first, then longest idle.
  const nudge: NudgeRow[] = enrolments
    .map((enrolment) => {
      const set = completedByEnrolment.get(enrolment.id) ?? new Set<string>();
      const last = lastActive.get(enrolment.id) ?? null;
      const idleDays = last ? Math.floor((now - last.getTime()) / (24 * 60 * 60 * 1000)) : null;
      const stuck = activities.find(
        (activity) => !set.has(activity.id) && (attemptsPerActivity.get(`${enrolment.id}:${activity.id}`) ?? 0) >= 2,
      );

      let signal = "No activity yet";
      let tone: "rose" | "amber" = "rose";
      if (stuck) {
        signal = `Stuck on ${stuck.title.slice(0, 28)}`;
        tone = "rose";
      } else if (idleDays !== null && idleDays >= 3) {
        signal = `Idle ${idleDays} days`;
        tone = "amber";
      } else if (set.size > 0) {
        signal = `${set.size} of ${total} done`;
        tone = "amber";
      }

      return {
        userId: enrolment.userId,
        name: enrolment.user.name,
        background: enrolment.user.background,
        completed: set.size,
        total,
        lastActive: last,
        signal,
        tone,
      };
    })
    .filter((row) => row.completed < total)
    .sort((a, b) => a.completed - b.completed || (a.lastActive?.getTime() ?? 0) - (b.lastActive?.getTime() ?? 0))
    .slice(0, 5);

  // One insight, stated only when the numbers support it — and attributed to
  // the right cause. A format that only appears in the final module will always
  // look weak; that is position, not difficulty, and saying "quizzes are hard"
  // would be a confident wrong answer.
  const weakest = byFormat.length > 0 ? byFormat[byFormat.length - 1] : null;
  const strongest = byFormat.length > 0 ? byFormat[0] : null;
  const moduleCount = Math.max(1, ...activities.map((activity) => activity.module.position));
  const weakestRows = weakest ? activities.filter((activity) => activity.format === weakest.format) : [];
  const weakestPosition = weakestRows.length
    ? weakestRows.reduce((sum, activity) => sum + activity.module.position, 0) / weakestRows.length
    : 0;
  const lateInCourse = weakestRows.length > 0 && weakestPosition > moduleCount - 1.5;

  const insight =
    weakest && strongest && strongest.pct - weakest.pct >= 10
      ? lateInCourse
        ? {
            headline: `Learners stop before module ${Math.round(weakestPosition)}`,
            body: `${weakest.label} activities finish ${weakest.pct}% of the time, ${strongest.pct - weakest.pct} points below ${strongest.label} — but every ${weakest.label.toLowerCase()} in this course sits in module ${Math.round(weakestPosition)} of ${moduleCount}. The drop is attrition, not difficulty. The change worth making is at the end of the previous module: a checkpoint that tells a learner what they are about to unlock, rather than another attempt at the last activity.`,
            activityTitle: weakestRows[0]?.title ?? null,
          }
        : {
            headline: `${weakest.label} finishes ${strongest.pct - weakest.pct} points below ${strongest.label}`,
            body: `Learners complete ${strongest.label.toLowerCase()} activities ${strongest.pct}% of the time and ${weakest.label.toLowerCase()} activities ${weakest.pct}% of the time, and the two are spread across the same modules — so this is the format, not the position. Consider a worked example before the first ${weakest.label.toLowerCase()}, and move the first hint from on-request to after one failure.`,
            activityTitle: weakestRows[0]?.title ?? null,
          }
      : null;

  return {
    learners: enrolments.length,
    activeThisWeek: weekly[weekly.length - 1]?.value ?? 0,
    completionRate: enrolments.length === 0 ? 0 : Math.round((finished / enrolments.length) * 100),
    averageProgress,
    finishedAll: finished,
    medianAttempts: Math.round(median([...attemptsPerActivity.values()]) * 10) / 10,
    tutorQuestions,
    weekly,
    byFormat,
    insight,
    nudge,
    rangeDays,
  };
}

export type LearnerProgressRow = {
  userId: string;
  name: string;
  email: string;
  background: "cs" | "non_cs";
  completed: number;
  total: number;
  minutesDone: number;
  lastActive: Date | null;
  idleDays: number | null;
  stuckOn: string | null;
  signal: string;
  tone: "teal" | "amber" | "rose";
};

/**
 * One row per enrolled learner, computed from the event log.
 *
 * The course editor's cohort table used to be a fixture keyed by user id — the
 * same four numbers for every course, regardless of who had actually done what.
 * This is the query that replaces it, so the table on the editor and the table
 * on /insights cannot disagree.
 */
export async function learnerProgress(courseId: string): Promise<LearnerProgressRow[]> {
  const [enrolments, activities, events] = await Promise.all([
    prisma.enrollment.findMany({ where: { courseId }, include: { user: true }, orderBy: { createdAt: "asc" } }),
    prisma.activity.findMany({
      where: { module: { courseId } },
      select: { id: true, title: true, minutes: true },
    }),
    prisma.event.findMany({
      where: { enrollment: { courseId } },
      select: { enrollmentId: true, activityId: true, type: true, createdAt: true },
    }),
  ]);

  const minutesOf = new Map(activities.map((activity) => [activity.id, activity.minutes]));
  const titleOf = new Map(activities.map((activity) => [activity.id, activity.title]));
  const done = new Map<string, Set<string>>();
  const attempts = new Map<string, number>();
  const lastActive = new Map<string, Date>();

  for (const event of events) {
    if (event.type === "activity_completed" && event.activityId) {
      const set = done.get(event.enrollmentId) ?? new Set<string>();
      set.add(event.activityId);
      done.set(event.enrollmentId, set);
    }
    if (event.type === "activity_attempted" && event.activityId) {
      const key = `${event.enrollmentId}:${event.activityId}`;
      attempts.set(key, (attempts.get(key) ?? 0) + 1);
    }
    const previous = lastActive.get(event.enrollmentId);
    if (!previous || event.createdAt > previous) lastActive.set(event.enrollmentId, event.createdAt);
  }

  const total = activities.length;
  const now = Date.now();

  return enrolments.map((enrolment) => {
    const set = done.get(enrolment.id) ?? new Set<string>();
    const last = lastActive.get(enrolment.id) ?? null;
    const idleDays = last ? Math.floor((now - last.getTime()) / (24 * 60 * 60 * 1000)) : null;
    const stuck = activities.find(
      (activity) => !set.has(activity.id) && (attempts.get(`${enrolment.id}:${activity.id}`) ?? 0) >= 2,
    );

    let signal = "No activity yet";
    let tone: LearnerProgressRow["tone"] = "rose";
    if (total > 0 && set.size >= total) {
      signal = "Finished";
      tone = "teal";
    } else if (stuck) {
      signal = `Stuck on ${titleOf.get(stuck.id)?.slice(0, 26) ?? "an activity"}`;
      tone = "rose";
    } else if (idleDays !== null && idleDays >= 3) {
      signal = `Idle ${idleDays} days`;
      tone = "amber";
    } else if (set.size > 0) {
      signal = idleDays === 0 ? "Active today" : `Active ${idleDays ?? 0}d ago`;
      tone = "teal";
    }

    return {
      userId: enrolment.userId,
      name: enrolment.user.name,
      email: enrolment.user.email,
      background: enrolment.user.background,
      completed: set.size,
      total,
      minutesDone: [...set].reduce((sum, id) => sum + (minutesOf.get(id) ?? 0), 0),
      lastActive: last,
      idleDays,
      stuckOn: stuck ? titleOf.get(stuck.id) ?? null : null,
      signal,
      tone,
    };
  });
}

/** Record that an instructor asked a learner to come back. */
export async function nudgeLearner(courseId: string, userId: string): Promise<void> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { courseId_userId: { courseId, userId } },
    select: { id: true },
  });
  if (!enrollment) return;
  await recordEvent({ enrollmentId: enrollment.id, activityId: null, type: "nudge_sent" });
}

/* ------------------------------------------------------------------ paths */

export type PathStepView = {
  id: string;
  position: number;
  title: string;
  detail: string;
  minutes: number;
  status: string;
  courseId: string | null;
  courseTitle: string | null;
};

export type PathView = {
  id: string;
  goal: string;
  domain: string;
  level: string;
  hoursPerWeek: number;
  weeks: number;
  model: string;
  createdAt: Date;
  steps: PathStepView[];
};

export async function getLatestPath(userId: string): Promise<PathView | null> {
  const row = await prisma.learningPath.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { steps: { orderBy: { position: "asc" }, include: { course: { select: { title: true } } } } },
  });
  if (!row) return null;
  return {
    ...row,
    steps: row.steps.map((step) => ({
      id: step.id,
      position: step.position,
      title: step.title,
      detail: step.detail,
      minutes: step.minutes,
      status: step.status,
      courseId: step.courseId,
      courseTitle: step.course?.title ?? null,
    })),
  };
}

export async function savePath(input: {
  userId: string;
  goal: string;
  domain: string;
  level: string;
  hoursPerWeek: number;
  weeks: number;
  model: string;
  steps: Array<{ title: string; detail: string; minutes: number; courseId: string | null }>;
}): Promise<string> {
  // Nested create for the same reason as createCourseFromOutline: a path is
  // one row plus a handful of steps, and a step-at-a-time loop inside a
  // five-second interactive transaction is a timeout waiting to happen.
  const path = await prisma.learningPath.create({
    data: {
      userId: input.userId,
      goal: input.goal,
      domain: input.domain,
      level: input.level,
      hoursPerWeek: input.hoursPerWeek,
      weeks: input.weeks,
      model: input.model,
      steps: {
        create: input.steps.map((step, index) => ({
          position: index + 1,
          title: step.title,
          detail: step.detail,
          minutes: step.minutes,
          courseId: step.courseId,
        })),
      },
    },
    select: { id: true },
  });

  return path.id;
}

export async function setPathStepStatus(stepId: string, status: string): Promise<void> {
  await prisma.pathStep.update({ where: { id: stepId }, data: { status } });
}

/** The library a path can draw on: published courses with their shape. */
export async function pathLibrary(): Promise<
  Array<{ id: string; title: string; brief: string; audience: string; minutes: number; modules: number; activities: number }>
> {
  const rows = await prisma.course.findMany({
    where: { status: "published" },
    orderBy: { minutes: "asc" },
    include: { modules: { select: { id: true, activities: { select: { id: true } } } } },
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    brief: row.brief,
    audience: row.audience,
    minutes: row.minutes,
    modules: row.modules.length,
    activities: row.modules.reduce((sum, module) => sum + module.activities.length, 0),
  }));
}

/**
 * Who the sign-in page offers.
 *
 * Three instructors/admins and three learners, not all 24: the point of the
 * picker is to show that the three roles get different shells, and a list of
 * 27 names demonstrates that worse than a list of 6.
 */
export async function listSignableUsers(): Promise<User[]> {
  const staff = await prisma.user.findMany({
    where: { role: { in: ["instructor", "admin"] } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
  const learners = await prisma.user.findMany({
    where: { id: { in: ["u-mei", "u-arjun", "u-sara"] } },
    orderBy: { name: "asc" },
  });
  return [...staff, ...learners];
}

/**
 * Resolve any user id, not only the six the sign-in page offers.
 *
 * The session cookie can legitimately name a roster learner (`u-gen-*`): the
 * preview pin picks exactly those, and an imported roster keeps growing. If the
 * lookup were restricted to the picker, those sessions would silently fall back
 * to the demo instructor — a learner would read the staff shell and the role
 * guard would never fire.
 */
export async function getUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

/**
 * Which learner an instructor's "preview as learner" lands on.
 *
 * The first enrolment of the course, in fixture order, so the preview is stable
 * between visits. A real product would let the instructor pick; that is a
 * dropdown, not a data-model change.
 */
/** Cookie that pins which learner an instructor is previewing as. */
export const PREVIEW_COOKIE = "praxis_preview";

export async function previewLearner(courseId?: string, pinnedId?: string): Promise<string | null> {
  const enrolments = await prisma.enrollment.findMany({
    where: courseId ? { courseId } : {},
    orderBy: { createdAt: "asc" },
    select: { id: true, userId: true },
  });
  if (enrolments.length === 0) return null;

  // A pinned learner wins. Without the pin, previewing is unstable in a way that
  // looks like a bug: the pick below is "closest to halfway", so the moment the
  // instructor completes an activity as that learner the numbers change and the
  // next request hands them somebody else. The banner is supposed to read
  // "Previewing as Omar", not reshuffle on every save.
  if (pinnedId && enrolments.some((row) => row.userId === pinnedId)) return pinnedId;

  // Prefer a learner who is roughly halfway: previewing someone who finished
  // everything shows a screen full of ticks and none of the states the player
  // exists to demonstrate.
  const total = courseId ? await prisma.activity.count({ where: { module: { courseId } } }) : 0;
  const counts = await prisma.event.groupBy({
    by: ["enrollmentId"],
    where: { enrollmentId: { in: enrolments.map((row) => row.id) }, type: "activity_completed" },
    _count: { _all: true },
  });
  const done = new Map(counts.map((row) => [row.enrollmentId, row._count._all]));

  const target = total / 2;
  let best = enrolments[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const enrolment of enrolments) {
    const count = done.get(enrolment.id) ?? 0;
    if (count === 0 || (total > 0 && count >= total)) continue;
    const distance = Math.abs(count - target);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = enrolment;
    }
  }
  return best.userId;
}

/** The next enrolled learner in a course, for the "preview as someone else" control. */
export async function nextPreviewLearner(courseId: string, currentId: string): Promise<string | null> {
  const enrolments = await prisma.enrollment.findMany({
    where: { courseId },
    orderBy: { userId: "asc" },
    select: { userId: true },
  });
  if (enrolments.length === 0) return null;
  const index = enrolments.findIndex((row) => row.userId === currentId);
  if (index === -1) return enrolments[0].userId;
  return enrolments[(index + 1) % enrolments.length].userId;
}

/**
 * The course an analytics screen should open on.
 *
 * Not the first row by title: "Product thinking for engineers" sorts first and
 * has no learners, so an instructor opening /insights cold would be shown a page
 * of zeros and conclude the feature was broken. The busiest course is the one
 * with something to say.
 */
export async function courseWithMostLearners(): Promise<string | null> {
  const rows = await prisma.course.findMany({
    select: { id: true, _count: { select: { enrollments: true } } },
    orderBy: { enrollments: { _count: "desc" } },
    take: 1,
  });
  return rows[0]?.id ?? null;
}
