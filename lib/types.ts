/**
 * Domain types.
 *
 * These mirror prisma/schema.prisma one-for-one. The schema is the source of
 * truth for the database; these types are what the UI and the repository speak.
 * When the Prisma client replaces the in-memory store in week 10, only
 * lib/store.ts changes — nothing that imports these types needs to move.
 */

export type Role = "learner" | "instructor" | "admin";
export type Background = "non_cs" | "cs";
export type CourseStatus = "draft" | "review" | "published";

/** The seven formats the brief asks for, plus peer review which we added. */
export type ActivityFormat =
  | "reading"
  | "simulation"
  | "code_lab"
  | "role_play"
  | "quiz"
  | "game"
  | "narrated_slides"
  | "peer_review";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  background: Background;
  /** BCP-47 tag. The UI ships en / zh-Hant / zh-Hans; the column is free text. */
  locale: string;
}

export interface Course {
  id: string;
  title: string;
  brief: string;
  /** Who the generated copy is written for. */
  audience: Background | "mixed";
  /** Total time budget in minutes. */
  minutes: number;
  status: CourseStatus;
  version: number;
  ownerId: string;
  code: string;
  term: string;
  /** Set when the course is attached to a class; null for library courses. */
  cohortId: string | null;
}

export interface Module {
  id: string;
  courseId: string;
  position: number;
  title: string;
  objective: string;
  estimatedMinutes: number;
}

export interface Activity {
  id: string;
  moduleId: string;
  position: number;
  title: string;
  format: ActivityFormat;
  minutes: number;
  /** Format-specific content: reading blocks, quiz questions, lab starter. */
  payload?: unknown;
  /** Grading criteria for peer review and role play. */
  rubric?: unknown;
}

export interface Cohort {
  id: string;
  code: string;
  name: string;
  term: string;
  /** Every cohort has exactly one responsible instructor. */
  instructorId: string;
  createdAt: string;
}

export interface Enrollment {
  id: string;
  courseId: string;
  userId: string;
  cohortId: string;
  importedFrom: "moodle" | "csv" | "manual";
  createdAt: string;
}

export interface VersionEntry {
  id: string;
  courseId: string;
  version: number;
  note: string;
  createdAt: string;
}

export interface VersionEntry {
  id: string;
  courseId: string;
  version: number;
  note: string;
  createdAt: string;
}

/** A course with its modules, activities and cohort resolved for rendering. */
export interface CourseView extends Course {
  modules: Array<Module & { activities: Activity[] }>;
  cohort: Cohort | null;
  learners: User[];
  versions: VersionEntry[];
}
