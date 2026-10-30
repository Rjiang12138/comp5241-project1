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
