/**
 * What a learner actually sees inside an activity.
 *
 * The schema has an `Activity.payload` JSON column for exactly this, and the
 * generated courses use it. The fixture courses are authored here instead,
 * because content that only exists to be read is easier to review in a diff
 * than in a database row — and because `prisma db push` should not be a
 * prerequisite for fixing a typo in a quiz question.
 *
 * `contentFor` is the seam: if an activity carries a payload, that wins; if it
 * does not, the format decides the shape and the module's objective supplies
 * the words. Nothing is invented beyond what the course already says, which is
 * why a course with no authored content still opens instead of 404-ing.
 */

import type { ActivityFormat } from "./types";

export type ReadingBlock = { heading?: string; text: string };

export type QuizQuestion = {
  prompt: string;
  options: string[];
  answer: number;
  explain: string;
};

/** A literal assertion over the learner's text. Not a runtime — see `code_lab`. */
export type CodeCheck = {
  name: string;
  mustInclude?: string[];
  mustNotInclude?: string[];
};

export type ActivityContent =
  | { kind: "reading"; blocks: ReadingBlock[] }
  | { kind: "quiz"; questions: QuizQuestion[] }
  | {
      kind: "code_lab";
      brief: string;
      task: string[];
      starter: string;
      checks: CodeCheck[];
      hint: string;
      solution: string;
    }
  | { kind: "role_play"; scenario: string; opening: string; rubric: string[] }
  | { kind: "simulation"; situation: string; options: { label: string; outcome: string; good: boolean }[] }
  | { kind: "peer_review"; instruction: string; diff: string; findings: { marker: string; note: string }[] }
  | { kind: "reflection"; prompt: string; prompts: string[] };

type ActivityLike = { id: string; title: string; format: ActivityFormat; payload?: unknown };
type ModuleLike = { title: string; objective: string };
type CourseLike = { title: string; brief: string };

/* ------------------------------------------------------------------ authored */

const AUTHORED: Record<string, ActivityContent> = {
  "a-1-1": {
    kind: "reading",
    blocks: [
      {
        text:
          "Programming is the part of the job you can see. Engineering is everything that makes the program survive: knowing what to build, deciding what not to build, and leaving enough evidence behind that the next person can change it without fear.",
      },
      {
        heading: "A promise, not a file",
        text:
          "A piece of software is a set of promises. To the user: this button saves your work. To the team: this function returns a string, never null. To the operator: this service stays up on Sunday. Most of what a software engineer does is decide which promises to make and then keep them under pressure.",
      },
      {
        heading: "The cost of skipping it",
        text:
          "When you skip the engineering, you do not skip the work — you move it later, to someone with less context and less time. A missing requirement becomes a rewrite. An untested assumption becomes an incident at 2am. The bill always arrives; the only question is who pays it.",
      },
      {
        heading: "What this course asks of you",
        text:
          "Every module in this course ends with something you produce, not something you read. That is deliberate: recognising a good requirement is not the same skill as writing one, and only one of them is worth a grade.",
      },
    ],
  },

  "a-2-1": {
    kind: "simulation",
    situation:
      "A client opens the kickoff meeting with: \"I want a dashboard. You know, like the one we saw in the demo — but for our data. Should be quick, right?\" You have one 30-minute meeting to turn this into something buildable.",
    options: [
      {
        label: "Agree it should be quick, and start building a dashboard shell.",
        outcome:
          "You now have a shell nobody asked for. Two weeks later the client says the numbers are wrong — they meant a different definition of \"active user\" — and the shell has to be rebuilt around it.",
        good: false,
      },
      {
        label: "Ask what decision the dashboard is supposed to change.",
        outcome:
          "The client says: \"I need to know by Monday which three accounts are about to churn.\" That is a completely different product from a dashboard, and it is buildable in a week.",
        good: true,
      },
      {
        label: "Ask for the fields and the data source, then estimate.",
        outcome:
          "You get a schema and a confident estimate. You still do not know why the thing exists, so when the data arrives the client is disappointed by a correct implementation.",
        good: false,
      },
    ],
  },

  "a-3-1": {
    kind: "reading",
    blocks: [
      {
        text:
          "An AI coding agent does not see your project. It sees the exact text you put in front of it, plus whatever it can reach with the tools you gave it. Everything else — the ticket in your head, the constraint your tech lead mentioned in standup, the reason that function has an odd name — does not exist for the agent.",
      },
      {
        heading: "The context window is a budget",
        text:
          "Everything the agent knows has to fit in a fixed number of tokens. That budget is spent on your instructions, the files it reads, its own reasoning and its output. Spend it on a 4,000-line file and there is nothing left to think with.",
      },
      {
        heading: "What that means in practice",
        text:
          "Delegation is a context problem before it is a prompting problem. Name the files. State the constraint. Say what done looks like. An agent given a vague brief does not ask a clarifying question — it guesses, confidently, in code.",
      },
    ],
  },

  "a-3-2": {
    kind: "code_lab",
    brief:
      "A signup form accepts an email address. Right now `createUser()` trusts it completely. Add the guard clause, then decide whether the agent's refactor is safe.",
    task: [
      "Reject an empty or malformed address before the user object is built.",
      "Throw a ValidationError — do not silently coerce.",
      "Leave the valid path untouched: a good address must come out unchanged.",
    ],
    starter: `// users/create-user.ts
export function createUser(input: SignupInput) {
  // TODO: reject an empty or malformed email
  const user = { id: nextId(), email: input.email };
  return user;
}`,
    checks: [
      { name: "rejects an empty email", mustInclude: ["ValidationError"], mustNotInclude: [] },
      { name: "rejects an address without @", mustInclude: ["@"] },
      { name: "does not mutate a valid address", mustInclude: ["input.email"] },
    ],
    hint:
      "Check the string before you build the object — `if (!input.email?.includes('@')) throw new ValidationError(...)`. A guard clause returns early, so nothing downstream has to know about bad input.",
    solution: `// users/create-user.ts
export function createUser(input: SignupInput) {
  if (!input.email?.includes("@")) {
    throw new ValidationError("email must contain @");
  }
  const user = { id: nextId(), email: input.email };
  return user;
}`,
  },

  "a-3-3": {
    kind: "peer_review",
    instruction:
      "The agent produced this patch for the same task. Read it and mark every line you would not merge.",
    diff: `@@ createUser @@
-  const user = { id: nextId(), email: input.email };
-  return user;
+  const email = input.email.trim().toLowerCase();
+  if (!email) return null;
+  if (!email.includes("@")) return null;
+  return { id: nextId(), email };`,
    findings: [
      {
        marker: "return null",
        note:
          "Two silent failures. The caller now has to check for null everywhere, and nothing tells the user what went wrong. The original contract was 'throws ValidationError'.",
      },
      {
        marker: "toLowerCase()",
        note:
          "Probably fine for email, but it is an unrequested behaviour change — a test that asserts the address comes back unchanged will now fail.",
      },
      {
        marker: "trim()",
        note:
          "Reasonable, and also unrequested. The point is not that it is wrong, it is that it was not in the brief and nobody reviewed it.",
      },
    ],
  },

  "a-4-1": {
    kind: "role_play",
    scenario:
      "You are in a design review. You proposed splitting the monolith into three services. The staff engineer disagrees, and has budget authority.",
    opening:
      "\"Three services means three deploys, three dashboards and three ways to page me at night. For a team of four. Convince me this is not resume-driven development.\"",
    rubric: [
      "Name the specific constraint that forces the split — not \"scalability\" in general.",
      "Acknowledge the operational cost honestly instead of dismissing it.",
      "Offer a smaller first step that would test the claim before committing.",
    ],
  },

  "a-5-1": {
    kind: "quiz",
    questions: [
      {
        prompt: "Which of these is a definition of done, rather than a definition of finished coding?",
        options: [
          "\"The feature branch is merged to main.\"",
          "\"A new user can sign up with a valid email, an invalid one sees a specific error, and both paths have a test that fails without the fix.\"",
          "\"The ticket is moved to Done in Jira.\"",
          "all three are equivalent",
        ],
        answer: 1,
        explain:
          "Only the second names observable behaviour and the evidence that proves it. The others describe the movement of work, not the state of the product.",
      },
      {
        prompt: "A test suite passes, but the tests never assert anything. What do you know?",
        options: [
          "The code is correct, because the tests pass.",
          "Nothing — a suite that cannot fail certifies nothing.",
          "The code is incorrect.",
          "Coverage is too low to tell.",
        ],
        answer: 1,
        explain:
          "A test is evidence only if it would have failed when the bug was present. Passing is not a signal; the ability to fail is.",
      },
      {
        prompt: "You are asked to add a feature in two days. The honest first move is:",
        options: [
          "Start coding immediately to maximise the time available.",
          "Ask what decision the feature is meant to change, and what would count as not worth building.",
          "Estimate more carefully, then start coding.",
          "Add it to the backlog and continue with the current sprint.",
        ],
        answer: 1,
        explain:
          "The cheapest feature is the one you establish is not needed. That question costs ten minutes and occasionally saves two days.",
      },
    ],
  },

  /* ------------------------------------------------- course c-agent (42 min) */

  "a-ag-1": {
    kind: "reading",
    blocks: [
      {
        text:
          "An agent works inside the text you hand it. Not your repository, not your standup, not the reason last month's refactor was reverted — the text, plus whatever its tools can reach from there. Everything you know and did not write down does not exist for it.",
      },
      {
        heading: "The window is a budget, not a limit",
        text:
          "A context window is a fixed number of tokens shared between your instructions, the files it reads, its own reasoning and its answer. Attaching a 2,000-line file is not free: it is tokens you can no longer spend on thinking about the change. Attach the file the change touches, not the directory it lives in.",
      },
      {
        heading: "Delegation is triage",
        text:
          "Three questions decide whether a task is worth handing over: can the agent see everything it needs, can it check its own work, and is the blast radius small enough that a wrong answer is cheap? A task that fails the second question is not delegable at any prompt length — you will be reading the output line by line anyway.",
      },
      {
        heading: "What this module asks of you",
        text:
          "Before you write a prompt, decide what the agent is allowed to be wrong about. That decision is the work; the prompt is how you record it.",
      },
    ],
  },

  "a-ag-2": {
    kind: "code_lab",
    brief:
      "Write the brief you would hand an agent for a change in this repository. It has to be specific enough that a reviewer could check the result without asking you what you meant.",
    task: [
      "Name the files to change — paths, not areas.",
      "State the constraint the agent cannot infer: compatibility, performance, style, a deadline.",
      "Say what done looks like in a form somebody else can check.",
    ],
    starter: `// The brief is the deliverable, not the code.
Files:
  - src/...

Constraint:
  - ...

Done when:
  - ...

// If this brief would still make sense for a different repository,
// it is not a brief.`,
    checks: [
      { name: "names a path, not an area", mustInclude: ["/"] },
      { name: "states a constraint", mustInclude: ["Constraint"] },
      { name: "says what done looks like", mustInclude: ["Done when"] },
    ],
    hint:
      "The constraint is the part only you know: the endpoint must stay backwards compatible, the list must stay under 100 ms, the naming must match the module next door. An agent will invent one if you leave it blank, and it will invent a reasonable one.",
    solution: `Files:
  - src/profile/load-profile.ts
  - src/profile/load-profile.test.ts

Constraint:
  - the public signature stays loadProfile(id: string): Promise<Profile>
  - no new dependency; retry with the existing fetch wrapper

Done when:
  - a network error retries exactly once, a 404 does not retry
  - both cases have a test that fails if the retry is removed`,
  },

  "a-ag-3": {
    kind: "peer_review",
    instruction:
      "The agent was asked to make `loadProfile` retry once on a network error. Mark what you would not merge.",
    diff: `@@ src/profile/load-profile.ts @@
-export async function loadProfile(id: string) {
-  return fetch(\`/api/profile/\${id}\`).then((r) => r.json());
-}
+export async function loadProfile(id: string) {
+  try {
+    return await fetch(\`/api/profile/\${id}\`).then((r) => r.json());
+  } catch {
+    return await fetch(\`/api/profile/\${id}\`).then((r) => r.json());
+  }
+}
+// no test was added`,
    findings: [
      {
        marker: "catch",
        note:
          "The retry fires on every failure, including a 404 or a body that is not JSON. A retry is only correct for a transient failure; here a permanent one costs a second round trip and hides the real error.",
      },
      {
        marker: "response.ok",
        note:
          "`fetch` resolves on 404, so this never throws for a missing profile — it parses an error page as a profile. The guard is missing, and the catch cannot save you from a bug it never sees.",
      },
      {
        marker: "no test was added",
        note:
          "Nothing proves the retry happens once and only once. The next change to this function can drop it and the suite stays green.",
      },
    ],
  },

  /* --------------------------------------------------- course c-req (38 min) */

  "a-req-1": {
    kind: "role_play",
    scenario:
      "You are the engineer on a room-booking system. The operations manager wants \"a way to see what's going on\". You have one conversation to turn that into requirements somebody could test.",
    opening: "\"I don't have time for a specification. Just build me a dashboard — you know what I mean.\"",
    rubric: [
      "Ask what decision they make with it, and how often they make it.",
      "Separate a constraint from a preference: \"must\" versus \"would be nice\".",
      "Close by reading back three testable statements and getting a yes.",
    ],
  },

  "a-req-2": {
    kind: "code_lab",
    brief:
      "Turn this paragraph into acceptance criteria, then into assertions: \"A student may book a lab seat up to 24 hours ahead. A cancellation inside 2 hours of the start is not allowed.\"",
    task: [
      "One assertion per rule, named after the rule — not after the function.",
      "Test the boundary: exactly 24 hours ahead passes, 24 hours and one minute fails.",
      "Do not test the UI. Test the rule.",
    ],
    starter: `// booking/rules.test.ts
describe("booking window", () => {
  it("allows a booking exactly 24 hours ahead", () => {
    // TODO
  });

  it("rejects a booking 24 hours and one minute ahead", () => {
    // TODO
  });

  it("rejects a cancellation inside 2 hours of the start", () => {
    // TODO
  });
});`,
    checks: [
      { name: "tests the 24-hour boundary", mustInclude: ["24"] },
      { name: "asserts, rather than calls", mustInclude: ["expect"] },
      { name: "covers the cancellation rule", mustInclude: ["cancel"] },
    ],
    hint:
      "Write the rule as a sentence first: \"book(start) is allowed when start - now <= 24h\". The assertion is that sentence with a number in it. If you cannot write the sentence, the requirement is not testable yet.",
    solution: `it("allows a booking exactly 24 hours ahead", () => {
  expect(canBook(now, addHours(now, 24))).toBe(true);
});

it("rejects a booking 24 hours and one minute ahead", () => {
  expect(canBook(now, addHours(now, 24.02))).toBe(false);
});

it("rejects a cancellation inside 2 hours of the start", () => {
  expect(canCancel(now, addHours(now, 1.5))).toBe(false);
});`,
  },

  "a-req-3": {
    kind: "reading",
    blocks: [
      {
        text:
          "An out-of-scope list is the part of the requirements document that says what this release will not do. It is short, it is written before the work starts, and it is the only section anyone reads twice.",
      },
      {
        heading: "Why it protects the schedule",
        text:
          "Scope does not grow because people are unreasonable. It grows because a boundary nobody wrote down is a boundary everyone can negotiate. \"We never said it would not sync offline\" is a much weaker position than \"offline sync is in the out-of-scope list, with the reason\".",
      },
      {
        heading: "How to write one",
        text:
          "Each line has three parts: what is excluded, who asked for it, and what would have to be true to include it. \"Offline sync — asked for by the field team — needs a conflict-resolution rule we do not have; revisit after the first cohort.\" That line ends an argument instead of starting one.",
      },
    ],
  },

  /* -------------------------------------------------- course c-test (35 min) */

  "a-ts-1": {
    kind: "code_lab",
    brief:
      "This test passes whether or not the code works. Make it fail when the code is wrong.",
    task: [
      "Assert the value, not its existence.",
      "Add a second case where the discount is zero — the boundary nobody tests.",
      "Leave a comment saying what would make this test fail.",
    ],
    starter: `test("discount is applied", () => {
  const total = applyDiscount(100, 0.1);
  expect(total).toBeDefined();
});`,
    checks: [
      { name: "asserts the discounted value", mustInclude: ["90"] },
      { name: "covers the zero-discount case", mustInclude: ["100"] },
      { name: "no longer asserts existence", mustNotInclude: ["toBeDefined"] },
    ],
    hint:
      "`toBeDefined()` is true for `undefined`'s cousins and for every wrong number. Replace it with the number you expect, then ask: if I broke `applyDiscount` by returning the input unchanged, would this test go red?",
    solution: `test("discount is applied", () => {
  expect(applyDiscount(100, 0.1)).toBe(90); // fails if the discount is skipped
});

test("a zero discount leaves the total alone", () => {
  expect(applyDiscount(100, 0)).toBe(100);
});`,
  },

  "a-ts-2": {
    kind: "code_lab",
    brief:
      "This test asserts how the code is written, not what it does. Rewrite it against observable behaviour so a refactor does not break it.",
    task: [
      "Delete the mock assertions on internal calls.",
      "Assert what the caller gets back, and what happens on a duplicate email.",
      "Keep it async — the failure path has to be awaited to be caught.",
    ],
    starter: `test("creates a user", async () => {
  const repo = { save: jest.fn() };
  await createUser({ email: "a@b.c" }, repo);
  expect(repo.save).toHaveBeenCalledTimes(1);
});`,
    checks: [
      { name: "awaits the call under test", mustInclude: ["await"] },
      { name: "covers the duplicate-email path", mustInclude: ["rejects"] },
      { name: "no longer asserts internal calls", mustNotInclude: ["toHaveBeenCalled"] },
    ],
    hint:
      "Ask what the caller can observe: the returned user, or the error thrown. If the only thing you can assert is \"save was called\", the function has no observable contract — which is the finding, not the test.",
    solution: `test("creates a user", async () => {
  const repo = { save: async (u) => ({ ...u, id: "u-1" }) };
  const user = await createUser({ email: "a@b.c" }, repo);
  expect(user.id).toBe("u-1");
});

test("rejects a duplicate email", async () => {
  const repo = { save: async () => { throw new DuplicateEmail(); } };
  await expect(createUser({ email: "a@b.c" }, repo)).rejects.toThrow(DuplicateEmail);
});`,
  },

  "a-ts-3": {
    kind: "simulation",
    situation:
      "Four paths in one service are untested and you have one afternoon. The checkout path runs on every order. The export job runs nightly on 2% of accounts. The admin filter is used twice a week by one person. The retry wrapper is used everywhere and has never been touched.",
    options: [
      {
        label: "Start with the checkout path, because it runs most often.",
        outcome:
          "Frequency is only half the answer. Checkout is loud: a bug there is caught in minutes by customers. You spent the afternoon on the path that would have told you it was broken anyway.",
        good: false,
      },
      {
        label: "Start with the retry wrapper: high blast radius, no coverage, recently changed.",
        outcome:
          "That is the intersection worth testing first — everything depends on it, nothing watches it, and a change there fails everywhere at once and silently. The checkout path is next, for the money.",
        good: true,
      },
      {
        label: "Start with the export job, because nobody looks at it.",
        outcome:
          "Plausible, and still wrong this week: a broken export is discovered by the person who needs the file, on the day they need it. Failure cost, not failure silence, decides the order.",
        good: false,
      },
    ],
  },

  /* -------------------------------------------------- course c-arch (50 min) */

  "a-ar-1": {
    kind: "reading",
    blocks: [
      {
        text:
          "Three shapes cover almost every small system. They differ less in what they can do than in what they cost to change, deploy and debug — which is the only comparison that matters if you have to operate the thing for two years.",
      },
      {
        heading: "Monolith",
        text:
          "One deployable, one database, function calls between modules. The cost is coupling: any module can reach into any other, and nothing stops it. The benefit is that a change is one commit and one deploy, and a stack trace is one stack trace.",
      },
      {
        heading: "Modular monolith",
        text:
          "The same single deployable, with boundaries enforced by the language — separate packages, no cross-imports, one schema per module. You pay in discipline (a linter rule and a reviewer who cares) and you buy the option to extract a module later without rewriting its callers.",
      },
      {
        heading: "Services",
        text:
          "Independent deploys, network calls between them. You buy independent scaling and independent failure — and you pay for it in partial failure, versioning, tracing across processes and a deployment pipeline per service. For a team of five, that bill usually arrives before the benefit does.",
      },
    ],
  },

  "a-ar-2": {
    kind: "simulation",
    situation:
      "A timetable service: 200 reads per write, queries by room and by week, needs range scans over time, about 5 GB, one region, two engineers. Pick the store.",
    options: [
      {
        label: "Postgres, with an index on (room_id, starts_at).",
        outcome:
          "Range queries by room and week are what a B-tree does. 5 GB fits in memory on a small instance, and one region means no replication story to maintain. Boring, and correct for the next two years.",
        good: true,
      },
      {
        label: "A document store keyed by room, one document per room-week.",
        outcome:
          "Reads by room are fast and reads by week across rooms are a scan of every document. You have optimised the query you already had and made the one you will need next month expensive.",
        good: false,
      },
      {
        label: "Redis as the primary store, because it is 200:1 reads.",
        outcome:
          "The read ratio is real and irrelevant: a timetable that loses a write is a student standing in the wrong room. Cache in front of Postgres if you must; do not make the cache the source of truth.",
        good: false,
      },
    ],
  },

  "a-ar-3": {
    kind: "reading",
    blocks: [
      {
        text:
          "Every component you add is something that can page you at 2am. A queue, a cache, a search cluster and a service mesh are four more things that can fail independently, each with its own upgrade path, monitoring and backup story.",
      },
      {
        heading: "The 2am test",
        text:
          "For each component, ask: when this breaks at 2am, who is woken, and what do they do? If the answer is \"nobody knows\", you have not added a capability, you have added an unknown. A component nobody can operate is worse than the feature it enables.",
      },
      {
        heading: "Buy the operations, not the software",
        text:
          "Managed Postgres and a managed queue cost money and remove a category of work. A self-hosted cluster costs less money and adds a permanent on-call rotation. The comparison is not licence fee against licence fee; it is licence fee against somebody's Friday night.",
      },
    ],
  },

  /* -------------------------------------------------- course c-prod (30 min) */

  "a-pr-1": {
    kind: "reading",
    blocks: [
      {
        text:
          "A feature request is a proposed solution with the problem filed off. \"Add a bulk-edit screen\" is a solution. The problem behind it is usually \"changing forty records takes an hour\", and there are at least three cheaper fixes for that.",
      },
      {
        heading: "One user, one change",
        text:
          "Name one person — not a segment, a person you could email — and one thing that is different in their day after you ship. If you cannot name the person, the requirement is a guess. If you cannot name the change, the feature is decoration.",
      },
      {
        heading: "Name the alternative",
        text:
          "What do they do today instead? A spreadsheet, a colleague, a workaround, nothing at all? If the answer is \"nothing\", you are inventing demand. If the answer is a spreadsheet, you now know what your product has to beat — and it is free, familiar and already installed.",
      },
    ],
  },

  "a-pr-2": {
    kind: "simulation",
    situation:
      "You are about to build search for a course platform. Six weeks of work. Before the first line, you have to say what success looks like.",
    options: [
      {
        label: "Ship it and watch the numbers.",
        outcome:
          "You will watch whatever the dashboard happens to show. Without a signal chosen in advance, every number becomes evidence after the fact — which is how features survive for years without helping anyone.",
        good: false,
      },
      {
        label: "Define the signal now: in a session that uses search, the learner opens a result within 30 seconds, and that rate beats browsing.",
        outcome:
          "Now the feature has a way to fail. If search sessions do not convert better than browsing, the six weeks bought a box on the page — and you will know in the first month, not the first year.",
        good: true,
      },
      {
        label: "Ask users whether they like it.",
        outcome:
          "They will say yes. People are polite about features, and \"do you like it\" measures politeness. Ask what they did last time they could not find something.",
        good: false,
      },
    ],
  },

  "a-pr-3": {
    kind: "role_play",
    scenario:
      "A sales lead wants SSO for a single prospect. You have two engineers and a release in three weeks. The prospect is worth real money and has said, in writing, that they will not sign without it.",
    opening: "\"It's one integration. Our prospect won't sign without it — do you want to lose the deal over a login screen?\"",
    rubric: [
      "Name what you would cut to fit it, rather than saying yes to both.",
      "Offer the smallest thing that unblocks the deal — a pilot, a manual workaround, one identity provider.",
      "Leave a written record of what was deferred, and the condition for picking it up.",
    ],
  },
};

/* ------------------------------------------------------------------ fallback */

function fallback(activity: ActivityLike, module: ModuleLike, course: CourseLike): ActivityContent {
  const subject = module.title.toLowerCase();

  switch (activity.format) {
    case "quiz":
      return {
        kind: "quiz",
        questions: [
          {
            prompt: `Which statement about ${subject} is defensible?`,
            options: [
              `It is settled practice and does not need justification in ${course.title}.`,
              `It depends on constraints that the module objective names: ${module.objective}`,
              "It only matters for large teams.",
              "It is a tooling choice with no effect on the outcome.",
            ],
            answer: 1,
            explain:
              "The module objective is the standard to test against. Anything that ignores the stated constraint is an opinion, not an answer.",
          },
        ],
      };
    case "code_lab":
      return {
        kind: "code_lab",
        brief: module.objective,
        task: [
          "Write the smallest change that satisfies the objective above.",
          "Say in one sentence what would break if you removed it.",
        ],
        starter: `// ${activity.title}\n// Objective: ${module.objective}\n\nexport function solve(input) {\n  // your code\n}`,
        checks: [{ name: "produced a non-empty answer", mustInclude: [] }],
        hint: "Start from the objective, not from the code. What observable behaviour would prove it?",
        solution: `// A worked answer is not stored for this activity.\n// Compare yours against the objective: ${module.objective}`,
      };
    case "simulation":
      return {
        kind: "simulation",
        situation: `${module.objective} You have one decision to make and no time to gather more information.`,
        options: [
          {
            label: "Act on the first plausible reading of the situation.",
            outcome: "You move fast and inherit whatever the situation actually was. Sometimes that is correct.",
            good: false,
          },
          {
            label: "Name the assumption you are making, then act on it.",
            outcome:
              "You move almost as fast, and when you are wrong the team knows exactly which assumption to revisit. This is the whole trick.",
            good: true,
          },
          {
            label: "Escalate and wait for more information.",
            outcome: "The decision is still yours in an hour, with less time and the same information.",
            good: false,
          },
        ],
      };
    case "role_play":
      return {
        kind: "role_play",
        scenario: module.objective,
        opening: `"I have read the brief for ${module.title}. I am not convinced it is worth the time. Change my mind."`,
        rubric: [
          "State the outcome in terms of what changes for the other person.",
          "Name one cost you are accepting.",
          "Propose the smallest thing that would settle the disagreement.",
        ],
      };
    case "peer_review":
      return {
        kind: "peer_review",
        instruction: `Someone else's attempt at "${module.title}". Find what you would not accept.`,
        diff: `@@ ${module.title} @@
-  // original
+  // proposed change: ${module.objective}
+  // no tests were added`,
        findings: [
          {
            marker: "no tests were added",
            note: "A change without a test is a claim without evidence. This is the finding to write up.",
          },
        ],
      };
    case "reading":
    default:
      return {
        kind: "reading",
        blocks: [
          { text: course.brief },
          { heading: module.title, text: module.objective },
          {
            text:
              "This activity has no authored text yet. The objective above is what it will be assessed against, and marking it complete records that you have read it.",
          },
        ],
      };
  }
}

/** The content for one activity: authored first, generated scaffold second. */
export function contentFor(activity: ActivityLike, module: ModuleLike, course: CourseLike): ActivityContent {
  const authored = AUTHORED[activity.id];
  if (authored) return authored;

  // A generated course carries its payload; trust it only if it names a kind.
  const payload = activity.payload as { kind?: string } | null | undefined;
  if (payload && typeof payload === "object" && typeof payload.kind === "string") {
    return payload as unknown as ActivityContent;
  }

  return fallback(activity, module, course);
}

/**
 * Whether this activity's body is written by hand in this file.
 *
 * The backfill in `fillActivityContent` uses it to leave the fixture course
 * alone: writing a payload for an activity whose content already exists in the
 * repository would only shadow it, and the next person to edit the quiz would
 * find their change ignored.
 */
export function hasAuthoredContent(activityId: string): boolean {
  return Boolean(AUTHORED[activityId]);
}

/** Human label for a format, used in the player header and the editor. */
export const FORMAT_LABEL: Record<ActivityFormat, string> = {
  reading: "Reading",
  quiz: "Quiz",
  code_lab: "Code lab",
  role_play: "Role play",
  simulation: "Simulation",
  peer_review: "Peer review",
  game: "Mini-game",
  narrated_slides: "Narrated slides",
};

/** Formats with no player yet. The UI says so instead of pretending. */
export const UNBUILT_FORMATS: ActivityFormat[] = ["game", "narrated_slides"];
