// The demo fixture, in one place.
//
// It lives in lib/ rather than in prisma/ because two callers need it:
//   - `prisma/seed.ts` (the CLI, run once after `db push`)
//   - `resetDemoDataAction` (the button on /settings, run before a demo)
// Keeping two copies would guarantee they drift, and the drift would only show
// up in front of an audience.
//
// Ids are written explicitly rather than generated: the prototype's screens,
// screenshots and the report all refer to /courses/c-sef, and a regenerated id
// would quietly break those links.

import type { ActivityFormat, Prisma, PrismaClient } from "@prisma/client";

const INSTRUCTORS: Prisma.UserCreateManyInput[] = [
  { id: "u-kwok", email: "r.kwok@polyu.edu.hk", name: "Dr. R. Kwok", role: "instructor", background: "cs", locale: "en" },
  { id: "u-chan", email: "m.chan@polyu.edu.hk", name: "Dr. M. Chan", role: "instructor", background: "cs", locale: "en" },
  { id: "u-tse", email: "a.tse@polyu.edu.hk", name: "A. Tse", role: "admin", background: "non_cs", locale: "en" },
];

// Learners are typed with a required id: their ids are referenced by the
// enrolments below, so an optional id would make the fixture unsafe to build.
type LearnerRow = { id: string; email: string; name: string; background: "cs" | "non_cs" };

const NAMED_LEARNERS: LearnerRow[] = [
  { id: "u-mei", email: "mei.wong@connect.polyu.hk", name: "Mei Wong", background: "non_cs" },
  { id: "u-arjun", email: "arjun.lee@connect.polyu.hk", name: "Arjun Lee", background: "cs" },
  { id: "u-sara", email: "sara.khan@connect.polyu.hk", name: "Sara Khan", background: "non_cs" },
  { id: "u-tom", email: "tom.ng@connect.polyu.hk", name: "Tom Ng", background: "cs" },
];

// 20 more so the cohort is the 24 the prototype claims: 14 non-CS, 10 CS.
const GENERATED_LEARNERS: LearnerRow[] = (
  [
    ["Ho Yan Lam", "non_cs"], ["Priya Nair", "cs"], ["Daniel Cheung", "cs"], ["Wing Sze Ho", "non_cs"],
    ["Omar Haddad", "cs"], ["Jia Wei Tan", "non_cs"], ["Chloe Yeung", "non_cs"], ["Ravi Menon", "cs"],
    ["Sin Ting Lau", "non_cs"], ["Marco Rossi", "cs"], ["Hoi Ching Ma", "non_cs"], ["Ananya Rao", "cs"],
    ["Ka Ho Tse", "non_cs"], ["Leo Fischer", "cs"], ["Pui Shan Yip", "non_cs"], ["Nadia Aziz", "non_cs"],
    ["Jun Hao Lim", "cs"], ["Emily Chow", "non_cs"], ["Tariq Rahman", "cs"], ["Sze Wing Kong", "non_cs"],
  ] as Array<[string, "cs" | "non_cs"]>
).map(([name, background], index) => ({
  id: `u-gen-${index + 1}`,
  email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@connect.polyu.hk`,
  name,
  background,
}));

const COHORTS: Array<Omit<Prisma.CohortCreateManyInput, "createdAt">> = [
  { id: "co-l01", code: "COMP5241 L01", name: "Software Engineering · L01", term: "2026/27 S1", instructorId: "u-kwok" },
  { id: "co-l02", code: "COMP5241 L02", name: "Software Engineering · L02", term: "2026/27 S1", instructorId: "u-chan" },
];

const COURSES: Prisma.CourseCreateManyInput[] = [
  {
    id: "c-sef",
    title: "Software Engineering Foundations",
    brief: "A 45-minute introduction to what software engineering actually is, for a mixed cohort of CS and non-CS students.",
    audience: "mixed",
    minutes: 47,
    status: "published",
    version: 3,
    ownerId: "u-kwok",
    code: "COMP5241",
    term: "Semester 1 2026/27",
    cohortId: "co-l01",
  },
  {
    id: "c-req",
    title: "Requirements that survive contact with users",
    brief: "Turn a stakeholder conversation into a testable requirement set without inventing scope.",
    audience: "mixed",
    minutes: 38,
    status: "draft",
    version: 1,
    ownerId: "u-kwok",
    code: "COMP5241",
    term: "Semester 1 2026/27",
    cohortId: null,
  },
  {
    id: "c-agent",
    title: "Working with an AI coding agent",
    brief: "Delegation, description, discernment, diligence — practised on a real patch review.",
    audience: "cs",
    minutes: 42,
    status: "published",
    version: 2,
    ownerId: "u-chan",
    code: "COMP5241",
    term: "Semester 1 2026/27",
    cohortId: null,
  },
  {
    id: "c-test",
    title: "Testing what matters",
    brief: "From a passing test suite to a suite that would actually catch the bug you are about to ship.",
    audience: "cs",
    minutes: 35,
    status: "review",
    version: 1,
    ownerId: "u-kwok",
    code: "COMP5241",
    term: "Semester 1 2026/27",
    cohortId: null,
  },
  {
    id: "c-arch",
    title: "System design for small teams",
    brief: "Choosing a shape for a system you will have to operate for two years, not two weeks.",
    audience: "cs",
    minutes: 50,
    status: "draft",
    version: 1,
    ownerId: "u-chan",
    code: "COMP5241",
    term: "Semester 1 2026/27",
    cohortId: null,
  },
  {
    id: "c-prod",
    title: "Product thinking for engineers",
    brief: "Framing the problem before the solution: who is it for, what changes for them, how would you know.",
    audience: "non_cs",
    minutes: 30,
    status: "draft",
    version: 1,
    ownerId: "u-kwok",
    code: "COMP5241",
    term: "Semester 1 2026/27",
    cohortId: null,
  },
];

type ModuleRow = [id: string, courseId: string, position: number, title: string, objective: string, minutes: number];

const MODULES: ModuleRow[] = [
  ["m-1", "c-sef", 1, "What software engineering actually is", "Separate programming from engineering, and name the cost of skipping the difference.", 6],
  ["m-2", "c-sef", 2, "From idea to requirements", "Turn a vague ask into three testable requirements.", 9],
  ["m-3", "c-sef", 3, "Pairing with an AI coding agent", "Delegate a task, then judge the patch that comes back.", 14],
  ["m-4", "c-sef", 4, "Design review role play", "Defend a design decision against a stakeholder who disagrees.", 10],
  ["m-5", "c-sef", 5, "Wrap-up: the definition of done", "Write a definition of done your team would actually sign.", 8],

  ["m-req-1", "c-req", 1, "The stakeholder interview", "Ask questions that surface constraints, not preferences.", 12],
  ["m-req-2", "c-req", 2, "Writing requirements you can test", "Convert a paragraph into acceptance criteria.", 14],
  ["m-req-3", "c-req", 3, "Scope: what you are not building", "Write an explicit out-of-scope list.", 12],

  ["m-ag-1", "c-agent", 1, "What the agent can and cannot see", "Explain the context window as a constraint on delegation.", 8],
  ["m-ag-2", "c-agent", 2, "Writing a brief the agent can act on", "Specify files, constraints and definition of done.", 16],
  ["m-ag-3", "c-agent", 3, "Reviewing the patch", "Find the one thing the agent got wrong.", 18],

  ["m-ts-1", "c-test", 1, "A test that cannot fail", "Recognise assertions that certify nothing.", 11],
  ["m-ts-2", "c-test", 2, "Test the behaviour, not the implementation", "Rewrite a brittle test against observable output.", 13],
  ["m-ts-3", "c-test", 3, "What to test first", "Rank a feature list by failure cost.", 11],

  ["m-ar-1", "c-arch", 1, "Monolith, modular, or services", "Pick a shape and defend it.", 20],
  ["m-ar-2", "c-arch", 2, "Where the data lives", "Choose a storage model from access patterns.", 18],
  ["m-ar-3", "c-arch", 3, "Operability as a design constraint", "Cost out what you are choosing to run.", 12],

  ["m-pr-1", "c-prod", 1, "Who is it for", "Name one user and one change in their day.", 10],
  ["m-pr-2", "c-prod", 2, "What would prove it worked", "Define a signal before building.", 10],
  ["m-pr-3", "c-prod", 3, "Saying no", "Cut a feature without losing the user.", 10],
];

type ActivityRow = [id: string, moduleId: string, position: number, title: string, format: string, minutes: number];

const ACTIVITIES: ActivityRow[] = [
  ["a-1-1", "m-1", 1, "Read: engineering is a set of promises", "reading", 6],
  ["a-2-1", "m-2", 1, "Simulation: the client who wants everything", "simulation", 9],
  ["a-3-1", "m-3", 1, "Read: what the agent can and cannot see", "reading", 4],
  ["a-3-2", "m-3", 2, "Code lab: write the validation rule", "code_lab", 8],
  ["a-3-3", "m-3", 3, "Review the agent's patch", "peer_review", 2],
  ["a-4-1", "m-4", 1, "Role play: the design review", "role_play", 10],
  ["a-5-1", "m-5", 1, "Quiz: the definition of done", "quiz", 8],

  ["a-req-1", "m-req-1", 1, "Role play: the stakeholder interview", "role_play", 12],
  ["a-req-2", "m-req-2", 1, "Code lab: acceptance criteria as tests", "code_lab", 14],
  ["a-req-3", "m-req-3", 1, "Read: the out-of-scope list", "reading", 12],

  ["a-ag-1", "m-ag-1", 1, "Read: the context window as a budget", "reading", 8],
  ["a-ag-2", "m-ag-2", 1, "Code lab: write the agent brief", "code_lab", 16],
  ["a-ag-3", "m-ag-3", 1, "Review: the patch with one bug", "peer_review", 18],

  ["a-ts-1", "m-ts-1", 1, "Code lab: the assertion that always passes", "code_lab", 11],
  ["a-ts-2", "m-ts-2", 1, "Code lab: rewrite the brittle test", "code_lab", 13],
  ["a-ts-3", "m-ts-3", 1, "Simulation: rank by failure cost", "simulation", 11],

  ["a-ar-1", "m-ar-1", 1, "Read: three shapes, three costs", "reading", 20],
  ["a-ar-2", "m-ar-2", 1, "Simulation: pick a store from access patterns", "simulation", 18],
  ["a-ar-3", "m-ar-3", 1, "Read: what you are choosing to operate", "reading", 12],

  ["a-pr-1", "m-pr-1", 1, "Read: one user, one change", "reading", 10],
  ["a-pr-2", "m-pr-2", 1, "Simulation: define the signal first", "simulation", 10],
  ["a-pr-3", "m-pr-3", 1, "Role play: the feature you cut", "role_play", 10],
];

type VersionRow = [id: string, courseId: string, version: number, note: string, createdAt: string];

const VERSIONS: VersionRow[] = [
  ["v-sef-3", "c-sef", 3, "Code lab hint scaffolding", "2026-10-22"],
  ["v-sef-2", "c-sef", 2, "Shortened Module 1", "2026-10-19"],
  ["v-sef-1", "c-sef", 1, "First generated draft", "2026-10-16"],
  ["v-ag-2", "c-agent", 2, "Added the patch review activity", "2026-10-20"],
  ["v-ag-1", "c-agent", 1, "First generated draft", "2026-10-15"],
];

export type SeedSummary = {
  users: number;
  cohorts: number;
  courses: number;
  modules: number;
  activities: number;
  enrolments: number;
  events: number;
};

/**
 * The event log, generated rather than invented.
 *
 * `events` is append-only and every number on /insights is derived from it, so
 * the fixture has to contain a plausible log or the analytics screen has
 * nothing to show but zeros. This produces a cohort that is mid-course: a few
 * learners finished, most are around the code lab, one never started — which is
 * the shape the prototype's copy describes.
 *
 * Dates are relative to *now*, not to a fixed term start. Anchoring them to
 * 2026-09-14 looked correct in September and read as "0% active this week" by
 * the end of October, because a fixture that stops moving makes a live
 * dashboard look broken. Each learner finishes their last activity a few days
 * ago, and the ones who stalled stall further back — which is exactly what the
 * nudge list is supposed to surface.
 */
const C_SEF_ACTIVITIES = ["a-1-1", "a-2-1", "a-3-1", "a-3-2", "a-3-3", "a-4-1", "a-5-1"];

// How many of the seven each of the 24 learners has finished, in fixture order.
const COMPLETION: number[] = [7, 6, 5, 7, 4, 6, 3, 5, 2, 4, 6, 3, 0, 5, 4, 2, 6, 5, 3, 4, 1, 5, 2, 3];

const DAY = 24 * 60 * 60 * 1000;

function buildEvents(learners: LearnerRow[]): Prisma.EventCreateManyInput[] {
  const rows: Prisma.EventCreateManyInput[] = [];
  const now = Date.now();
  let serial = 0;

  /** `daysAgo` before now, at a given hour of that day. */
  const at = (daysAgo: number, hour: number): Date => {
    const day = new Date(now - Math.max(0, daysAgo) * DAY);
    day.setHours(hour, (serial * 7) % 60, 0, 0);
    return day;
  };

  learners.forEach((learner, index) => {
    const enrollmentId = `e-${index + 1}`;
    const done = COMPLETION[index] ?? 0;
    if (done === 0) return;

    // The last completed activity is 1–4 days ago for most learners, so "active
    // this week" is a real number rather than a zero.
    const pace = 4 + (index % 3);
    const daysSinceLast = 1 + (index % 4);
    const firstDaysAgo = daysSinceLast + (done - 1) * pace;

    for (let step = 0; step < done; step += 1) {
      const activityId = C_SEF_ACTIVITIES[step];
      const daysAgo = firstDaysAgo - step * pace;

      rows.push({
        id: `ev-${(serial += 1)}`,
        enrollmentId,
        activityId,
        type: "activity_started",
        createdAt: at(daysAgo, 9),
      });
      rows.push({
        id: `ev-${(serial += 1)}`,
        enrollmentId,
        activityId,
        type: "activity_completed",
        createdAt: at(daysAgo, 10),
        payload: { minutes: 8 },
      });
    }

    // Everyone who reaches the code lab and stops there has failed it at least
    // twice — that is the finding the insight panel is allowed to state.
    const nextStep = done;
    if (nextStep < C_SEF_ACTIVITIES.length && C_SEF_ACTIVITIES[nextStep] === "a-3-2") {
      const failedDaysAgo = Math.max(1, daysSinceLast - 1);
      rows.push({
        id: `ev-${(serial += 1)}`,
        enrollmentId,
        activityId: "a-3-2",
        type: "activity_attempted",
        createdAt: at(failedDaysAgo + 1, 10),
        payload: { passed: 1, total: 3 },
      });
      rows.push({
        id: `ev-${(serial += 1)}`,
        enrollmentId,
        activityId: "a-3-2",
        type: "activity_attempted",
        createdAt: at(failedDaysAgo, 11),
        payload: { passed: 2, total: 3 },
      });
      if (index % 3 === 0) {
        rows.push({
          id: `ev-${(serial += 1)}`,
          enrollmentId,
          activityId: "a-3-2",
          type: "hint_opened",
          createdAt: at(failedDaysAgo, 12),
        });
      }
    }

    // Tutor questions scale with how far the learner got, which is what the
    // "62% answered from course material" claim was standing in for.
    const questions = Math.min(6, Math.floor(done * 0.8));
    for (let question = 0; question < questions; question += 1) {
      rows.push({
        id: `ev-${(serial += 1)}`,
        enrollmentId,
        activityId: C_SEF_ACTIVITIES[Math.min(question, done - 1)] ?? null,
        type: "tutor_asked",
        createdAt: at(firstDaysAgo - question * 2 + 1, 14),
        payload: { grounded: question % 5 !== 0 },
      });
    }
  });

  return rows;
}

export async function seedDemoData(prisma: PrismaClient): Promise<SeedSummary> {
  const learners = [...NAMED_LEARNERS, ...GENERATED_LEARNERS];

  const users: Prisma.UserCreateManyInput[] = [
    ...INSTRUCTORS,
    ...learners.map((learner) => ({ ...learner, role: "learner" as const, locale: "en" })),
  ];

  const enrolments: Prisma.EnrollmentCreateManyInput[] = learners.map((learner, index) => ({
    id: `e-${index + 1}`,
    courseId: "c-sef",
    userId: learner.id,
    cohortId: "co-l01",
    importedFrom: "moodle",
    createdAt: new Date("2026-09-20"),
  }));

  const events = buildEvents(learners);

  await prisma.$transaction([
    // One statement instead of ten. CASCADE covers the foreign keys, and every
    // table listed here is a table this fixture owns — nothing outside it.
    prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "Event", "AiRun", "Enrollment", "CourseVersion", "Activity",
        "Module", "Course", "Cohort", "User", "PromptVersion" RESTART IDENTITY CASCADE`,
    ),

    prisma.user.createMany({ data: users }),
    prisma.cohort.createMany({
      data: COHORTS.map((cohort) => ({ ...cohort, createdAt: new Date("2026-09-14") })),
    }),
    prisma.course.createMany({ data: COURSES }),
    prisma.module.createMany({
      data: MODULES.map(([id, courseId, position, title, objective, estimatedMinutes]) => ({
        id,
        courseId,
        position,
        title,
        objective,
        estimatedMinutes,
      })),
    }),
    prisma.activity.createMany({
      data: ACTIVITIES.map(([id, moduleId, position, title, format, minutes]) => ({
        id,
        moduleId,
        position,
        title,
        format: format as ActivityFormat,
        minutes,
      })),
    }),
    prisma.courseVersion.createMany({
      data: VERSIONS.map(([id, courseId, version, note, createdAt]) => ({
        id,
        courseId,
        version,
        note,
        createdAt: new Date(createdAt),
      })),
    }),
    // Everyone in the demo is enrolled in the one published course, so the
    // cohort reads as the 24 the prototype describes. L02 exists but is empty:
    // a newly created class is exactly what the admin screen is for.
    prisma.enrollment.createMany({ data: enrolments }),

    // The log the analytics screen reads. Without it /insights is a page of
    // zeros, and a page of zeros is indistinguishable from a broken query.
    prisma.event.createMany({ data: events }),
  ]);

  // Counted from what was inserted rather than re-queried: the transaction
  // either committed all of it or none of it, and six more round trips is six
  // more reasons for the button to feel slow.
  return {
    users: users.length,
    cohorts: COHORTS.length,
    courses: COURSES.length,
    modules: MODULES.length,
    activities: ACTIVITIES.length,
    enrolments: enrolments.length,
    events: events.length,
  };
}
