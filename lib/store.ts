import { prisma } from "./db";
import type { GeneratedOutline } from "./generate";
import type {
  Activity,
  ActivityFormat,
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
  });
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
  });
}

/** Publishing is a gate, not a toggle: it records a version row every time. */
export async function publishCourse(courseId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const course = await tx.course.update({
      where: { id: courseId },
      data: { version: { increment: 1 }, status: "published" },
      select: { version: true },
    });
    await tx.courseVersion.create({
      data: { courseId, version: course.version, note: "Published from the course editor" },
    });
  });
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
  return prisma.$transaction(async (tx) => {
    const course = await tx.course.create({
      data: {
        title: input.title.trim() || "Untitled course",
        brief: input.brief,
        audience: input.audience,
        minutes: input.minutes,
        ownerId: input.ownerId,
        status: "draft",
      },
      select: { id: true },
    });

    for (const [moduleIndex, module] of input.outline.modules.entries()) {
      const created = await tx.module.create({
        data: {
          courseId: course.id,
          position: moduleIndex + 1,
          title: module.title,
          objective: module.objective,
          estimatedMinutes: module.estimatedMinutes,
        },
        select: { id: true },
      });

      for (const [activityIndex, activity] of module.activities.entries()) {
        await tx.activity.create({
          data: {
            moduleId: created.id,
            position: activityIndex + 1,
            title: activity.title,
            format: activity.format,
            minutes: activity.minutes,
          },
        });
      }
    }

    await tx.aiRun.create({
      data: {
        purpose: "outline",
        courseId: course.id,
        // Which prompt produced this draft, so a later audit can tell a model
        // draft from a template one without reading the course itself.
        promptVersion: input.outline.template ? "template-v1" : "outline-json-v1",
        model: input.model,
        latencyMs: input.outline.steps.reduce((sum, step) => sum + step.ms, 0),
        acceptedBy: input.ownerId,
      },
    });

    return course.id;
  });
}
