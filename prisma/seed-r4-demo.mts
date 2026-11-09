// Add a clearly identified demonstration course to an explicitly chosen local DB.
// No truncate, update, upsert, or deletion: existing work is preserved.
import { PrismaClient, type Prisma } from "@prisma/client";

const demoUrl = process.env.R4_DEMO_DATABASE_URL;
if (!demoUrl) throw new Error("Set R4_DEMO_DATABASE_URL to a local PostgreSQL demo database.");
let parsed: URL;
try { parsed = new URL(demoUrl); } catch { throw new Error("R4_DEMO_DATABASE_URL is not a valid URL."); }
if (!["postgres:", "postgresql:"].includes(parsed.protocol) || !["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname)) {
  throw new Error("R4_DEMO_DATABASE_URL must point directly to localhost or 127.0.0.1. Remote databases are not supported.");
}

const prisma = new PrismaClient({ datasources: { db: { url: demoUrl } } });
const prefix = "r4-demo-";
const courseId = `${prefix}course`;
const teacherId = `${prefix}teacher`;
const cohortId = `${prefix}cohort`;
const day = 24 * 60 * 60 * 1000;
const now = Date.now();
const at = (daysAgo: number) => new Date(now - daysAgo * day);

async function main() {
  if (await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } })) {
    console.log("R4 demo course already exists; no records changed.");
    return;
  }
  const users: Prisma.UserCreateManyInput[] = [
    { id: teacherId, email: "r4-demo-teacher@example.test", name: "DEMO Teacher", role: "instructor" },
    ...Array.from({ length: 6 }, (_, index) => ({
      id: `${prefix}learner-${index + 1}`, email: `r4-demo-learner-${index + 1}@example.test`,
      name: `DEMO Learner ${index + 1}`, role: "learner" as const,
      background: index % 2 ? "cs" as const : "non_cs" as const,
    })),
  ];
  const enrolments: Prisma.EnrollmentCreateManyInput[] = Array.from({ length: 6 }, (_, index) => ({
    id: `${prefix}enrollment-${index + 1}`, courseId, userId: `${prefix}learner-${index + 1}`, cohortId,
    importedFrom: "synthetic-demo", createdAt: at(50),
  }));
  const events: Prisma.EventCreateManyInput[] = [];
  for (let index = 1; index <= 6; index += 1) {
    const enrollmentId = `${prefix}enrollment-${index}`;
    events.push({ id: `${prefix}reading-done-${index}`, enrollmentId, activityId: `${prefix}reading`, type: "activity_completed", createdAt: at(index + 3) });
    events.push({ id: `${prefix}past-visit-${index}`, enrollmentId, activityId: `${prefix}reading`, type: "activity_started", createdAt: at(index * 7 + 3) });
    if (index >= 2 && index <= 4) {
      events.push({ id: `${prefix}quiz-attempt-${index}`, enrollmentId, activityId: `${prefix}quiz`, type: "activity_attempted", payload: { passed: 1, total: 1 }, createdAt: at(index + 1) });
      events.push({ id: `${prefix}quiz-done-${index}`, enrollmentId, activityId: `${prefix}quiz`, type: "activity_completed", payload: { correct: 1, total: 1 }, createdAt: at(index) });
    }
  }
  events.push({ id: `${prefix}quiz-attempt-1`, enrollmentId: `${prefix}enrollment-1`, activityId: `${prefix}quiz`, type: "activity_attempted", payload: { passed: 0, total: 1 }, createdAt: at(1) });
  events.push({ id: `${prefix}simulation-done-4`, enrollmentId: `${prefix}enrollment-4`, activityId: `${prefix}simulation`, type: "activity_completed", createdAt: at(0.5) });

  await prisma.$transaction(async (tx) => {
    await tx.user.createMany({ data: users });
    await tx.cohort.create({ data: { id: cohortId, code: "R4-DEMO", name: "DEMO — simulated cohort", term: "Demo", instructorId: teacherId } });
    await tx.course.create({ data: {
      id: courseId, title: "DEMO — Client, API and Database", code: "R4-DEMO", term: "Demo",
      brief: "Synthetic demonstration course and learning activity. No real students or AI runs are represented.",
      audience: "non_cs", minutes: 20, ownerId: teacherId, cohortId, status: "published",
    } });
    await tx.module.createMany({ data: [
      { id: `${prefix}module-1`, courseId, position: 1, title: "Read the request path", objective: "Identify the client, API and database in a request path.", estimatedMinutes: 12 },
      { id: `${prefix}module-2`, courseId, position: 2, title: "Apply the request path", objective: "Choose a reasonable next step when the API cannot reach the database.", estimatedMinutes: 8 },
    ] });
    await tx.activity.createMany({ data: [
      { id: `${prefix}reading`, moduleId: `${prefix}module-1`, position: 1, title: "Three parts of a request", format: "reading", minutes: 6,
        payload: { kind: "reading", blocks: [{ heading: "Client → API → Database", text: "A client sends a request to an API. The API can read or write information in a database before returning a response. This example is synthetic demo material." }] } },
      { id: `${prefix}quiz`, moduleId: `${prefix}module-1`, position: 2, title: "Identify the middle component", format: "quiz", minutes: 6,
        payload: { kind: "quiz", questions: [{ prompt: "Which component sits between the client and database?", options: ["The API", "The browser tab title", "A presentation slide"], answer: 0, explain: "In the example path, the client calls the API, which communicates with the database." }] } },
      { id: `${prefix}simulation`, moduleId: `${prefix}module-2`, position: 1, title: "Database connection failure", format: "simulation", minutes: 8,
        payload: { kind: "simulation", situation: "The API cannot reach the database. What should you check first?", options: [
          { label: "Check the connection error and database availability.", outcome: "This gathers evidence about the failed connection.", good: true },
          { label: "Tell users the request succeeded without checking.", outcome: "This hides the failure and may mislead users.", good: false },
        ] } },
    ] });
    await tx.enrollment.createMany({ data: enrolments });
    await tx.event.createMany({ data: events });
  });
  console.log(`Created synthetic R4 demo: 1 course, 6 learners, 3 activities, ${events.length} simulated events. No AI runs were created.`);
}

main().catch((error) => { console.error("R4 demo seed failed; transaction rolled back:", error.message); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
