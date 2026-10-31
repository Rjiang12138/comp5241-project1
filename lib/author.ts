import type { ActivityFormat } from "./types";
import type { ActivityContent, QuizQuestion } from "./activity-content";

/**
 * Filling an activity body from the material that produced it.
 *
 * The generator used to stop at structure: a module had a title, an objective
 * and two activities, and the activities themselves fell through to
 * `fallback()` — "Which statement about <module> is defensible?". That reads as
 * a course until you open one, and then it reads as a placeholder, because it
 * is one.
 *
 * This module closes that gap without a second model call. By the time the
 * outline exists, the pipeline already holds the instructor's own text: each
 * module came from a section of the deck, and that section has a title and a
 * body. Filling the template from those sentences produces a reading that
 * quotes the lecture, a quiz whose answers are in the reading, and a task that
 * names the module's own claim.
 *
 * What it cannot do is understand the material. A cloze question tests whether
 * you read the section, not whether you understood it; a role play built this
 * way is a rehearsal of the module's argument, not a scenario invented by
 * someone who knows the domain. That is why the studio still says "template
 * draft" and why the editor shows what each activity was built from.
 */

export type AuthorSection = { title: string; body: string[] };

export type AuthorInput = {
  format: ActivityFormat;
  title: string;
  moduleTitle: string;
  objective: string;
  courseTitle: string;
  /** The section of the source material this module came from, when there is one. */
  section?: AuthorSection | null;
  /** The other modules' objectives, used as plausible wrong answers. */
  siblings?: string[];
};

const STOP = new Set([
  "the", "a", "an", "and", "or", "but", "if", "then", "than", "that", "this", "these", "those", "there",
  "is", "are", "was", "were", "be", "been", "being", "has", "have", "had", "do", "does", "did", "can",
  "could", "should", "would", "will", "may", "might", "must", "not", "no", "yes", "you", "your", "we",
  "our", "they", "their", "it", "its", "he", "she", "his", "her", "them", "from", "into", "with", "for",
  "about", "over", "under", "between", "when", "where", "which", "what", "who", "how", "why", "all",
  "any", "each", "more", "most", "some", "such", "only", "also", "very", "just", "like", "one", "two",
  "use", "used", "using", "make", "made", "get", "got", "say", "said", "see", "seen", "way", "ways",
]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP.has(word) && !/^\d+$/.test(word));
}

/** Sentences long enough to be a claim, short enough to quote. */
function sentencesOf(lines: string[]): string[] {
  return lines
    .join(" ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter((sentence) => sentence.split(" ").length >= 5);
}

/**
 * The words a section is *about*.
 *
 * Frequency first, then length: a term repeated in a section is the thing the
 * slides keep coming back to, and that is what a cloze should blank.
 */
function keyTerms(section: AuthorSection | null | undefined): string[] {
  if (!section) return [];
  const counts = new Map<string, { word: string; count: number }>();
  for (const line of section.body) {
    for (const token of tokens(line)) {
      const row = counts.get(token) ?? { word: token, count: 0 };
      row.count += 1;
      counts.set(token, row);
    }
  }
  return [...counts.values()]
    .filter((row) => row.word.length >= 5)
    .sort((a, b) => b.count - a.count || b.word.length - a.word.length)
    .map((row) => row.word)
    .slice(0, 12);
}

function hash(text: string): number {
  let value = 0;
  for (let index = 0; index < text.length; index += 1) value = (value * 31 + text.charCodeAt(index)) % 100000;
  return value;
}

function cap(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trim()}…`;
}

function firstSentence(section: AuthorSection | null | undefined): string {
  return sentencesOf(section?.body ?? [])[0] ?? "";
}

/* ------------------------------------------------------------------ reading */

function reading(input: AuthorInput): ActivityContent {
  const body = (input.section?.body ?? []).map((line) => line.trim()).filter(Boolean);
  const blocks: Array<{ heading?: string; text: string }> = [];

  if (body.length === 0) {
    blocks.push({ heading: input.moduleTitle, text: input.objective });
    return { kind: "reading", blocks };
  }

  // Slides arrive as bullets, so two of them make a paragraph-sized block.
  blocks.push({ heading: input.section?.title ?? input.moduleTitle, text: cap(body.slice(0, 2).join(" "), 420) });
  for (let index = 2; index < body.length && blocks.length < 4; index += 2) {
    blocks.push({ text: cap(body.slice(index, index + 2).join(" "), 420) });
  }

  // The objective is the one sentence in the module written to be understood on
  // its own; ending the reading with it gives the learner something to check
  // their understanding against.
  if (input.objective && !blocks.some((block) => block.text.includes(input.objective))) {
    blocks.push({ heading: "What to take away", text: input.objective });
  }

  return { kind: "reading", blocks };
}

/* --------------------------------------------------------------------- quiz */

function quiz(input: AuthorInput): ActivityContent {
  const section = input.section ?? null;
  const terms = keyTerms(section);
  const questions: QuizQuestion[] = [];
  const asked = new Set<string>();

  for (const sentence of sentencesOf(section?.body ?? [])) {
    if (questions.length >= 3) break;
    if (sentence.length < 45 || sentence.length > 210) continue;

    // One question per term: three cloze questions that all blank the same word
    // are one question asked three times.
    const answer = terms.find((term) => !asked.has(term) && new RegExp(`\\b${term}\\b`, "i").test(sentence));
    if (!answer) continue;

    // Prefer distractors that have not been an answer yet, so the option list
    // changes between questions instead of repeating the same three words.
    const fresh = terms.filter((term) => term !== answer && !asked.has(term));
    const rest = terms.filter((term) => term !== answer && asked.has(term));
    const distractors = [...fresh, ...rest].slice(0, 2);
    if (distractors.length < 2) continue;

    asked.add(answer);

    // Rotate the correct option so it is not always first — a quiz whose answer
    // is always A is a quiz about clicking, not about the material.
    const options = [...distractors];
    const answerIndex = hash(sentence) % 3;
    options.splice(answerIndex, 0, answer);

    questions.push({
      prompt: sentence.replace(new RegExp(`\\b${answer}\\b`, "i"), "____"),
      options,
      answer: answerIndex,
      explain: `From the material: “${sentence}”`,
    });
  }

  if (questions.length > 0) return { kind: "quiz", questions };

  // No quotable sentence (a brief, or a deck of two-word bullets). The module
  // objective is still the instructor's own claim, so the question is "which of
  // these does this module actually assert" and the wrong answers are what the
  // other modules assert.
  const others = (input.siblings ?? []).filter((objective) => objective && objective !== input.objective).slice(0, 2);
  const options = [input.objective, ...others, "None of these — the module makes no claim."];
  const answerIndex = hash(input.moduleTitle) % 2;

  if (answerIndex === 1 && options.length > 1) {
    [options[0], options[1]] = [options[1], options[0]];
  }

  return {
    kind: "quiz",
    questions: [
      {
        prompt: `Which of these does “${input.moduleTitle}” claim?`,
        options,
        answer: 0,
        explain: `The module's objective, in the instructor's words: “${input.objective}”`,
      },
    ],
  };
}

/* ----------------------------------------------------------------- code lab */

function codeLab(input: AuthorInput): ActivityContent {
  const term = keyTerms(input.section)[0];
  const checks = [{ name: "contains an assertion with a message", mustInclude: ["assert"] }];
  if (term) checks.push({ name: `uses the term the material uses (“${term}”)`, mustInclude: [term] });

  return {
    kind: "code_lab",
    brief: `Write the check that would prove this claim: ${input.objective}`,
    task: [
      "Write one assertion that fails when the claim above is false.",
      term ? `Use the term the material uses: “${term}”.` : "Use the vocabulary of the module, not a synonym.",
      "Add a message that says what the reader should conclude when it fails.",
    ],
    starter: `// ${input.title}\n// ${input.objective}\n\nfunction check(input) {\n  // assert(<condition>, "<what a failure means>")\n}\n`,
    checks,
    hint: "Start from the claim, not from the code. What observable result would be different if the claim were false?",
    solution: `// One worked shape — compare, do not paste:\n// assert(input.outcome === expected, "the claim in “${input.moduleTitle}” does not hold for this input")`,
  };
}

/* ---------------------------------------------------------------- simulation */

function simulation(input: AuthorInput): ActivityContent {
  const quote = firstSentence(input.section);
  const options = [
    {
      label: "Apply the rule as the material states it, and note where it hurts.",
      outcome: quote
        ? `The rule exists because of a case the material names: “${cap(quote, 160)}”. Following it costs you something and buys the thing it was written for.`
        : `You follow the module's rule: ${input.objective}`,
      good: true,
    },
    {
      label: "Do what is fastest now and revisit it if someone complains.",
      outcome:
        "The complaint arrives as a bug, not as a design question, so the fix is now urgent and narrow. This is the cost the rule was written to avoid.",
      good: false,
    },
    {
      label: "Escalate and wait for a decision.",
      outcome: "The decision is still yours in an hour, with less time and the same information.",
      good: false,
    },
  ];

  // Put the good answer somewhere other than first on some modules.
  if (hash(input.moduleTitle) % 2 === 1) {
    [options[0], options[1]] = [options[1], options[0]];
  }

  return {
    kind: "simulation",
    situation: `${input.objective}${quote ? ` The material's own words: “${cap(quote, 180)}”` : ""} You have one decision to make and no time to gather more information.`,
    options,
  };
}

/* ----------------------------------------------------------------- role play */

function rolePlay(input: AuthorInput): ActivityContent {
  const quote = firstSentence(input.section);

  return {
    kind: "role_play",
    scenario: `${input.objective} You are explaining why it matters to someone who has ten minutes and no reason to care yet.`,
    opening: `"I have read “${input.moduleTitle}”. I am not convinced it is worth the time — give me one reason that changes my mind."`,
    rubric: [
      quote ? `Cite the material rather than your opinion: “${cap(quote, 140)}”` : "State the rule the module is built on.",
      "Name what it costs to skip, in terms the other person already cares about.",
      "Propose the smallest thing that would settle the disagreement.",
    ],
  };
}

/* --------------------------------------------------------------- peer review */

function peerReview(input: AuthorInput): ActivityContent {
  const quote = firstSentence(input.section);

  return {
    kind: "peer_review",
    instruction: `Someone's patch claims to satisfy “${input.moduleTitle}”. Mark what you would not merge.`,
    diff: `@@ ${input.moduleTitle} @@
-  // before: ${quote ? cap(quote, 120) : "the existing behaviour"}
+  // after: ${cap(input.objective, 120)}
+  // no test was added`,
    findings: [
      {
        marker: "no test was added",
        note: "A change that claims to satisfy a rule without a test is a claim without evidence. This is the finding to write up.",
      },
      {
        marker: "before",
        note: quote
          ? `The material said: “${cap(quote, 140)}”. Does the patch preserve that, or quietly replace it?`
          : "Compare the patch against the module's rule, not against the author's intent.",
      },
    ],
  };
}

/**
 * Build one activity's body.
 *
 * Every branch is a pure function of text the instructor already supplied —
 * the module objective, the section it came from, and the course brief. Nothing
 * is fetched, nothing is guessed about the domain.
 */
export function authorContent(input: AuthorInput): ActivityContent {
  switch (input.format) {
    case "reading":
      return reading(input);
    case "quiz":
      return quiz(input);
    case "code_lab":
      return codeLab(input);
    case "simulation":
      return simulation(input);
    case "role_play":
      return rolePlay(input);
    case "peer_review":
      return peerReview(input);
    // Not built yet; the player says so and never reads these.
    case "game":
    case "narrated_slides":
      return reading(input);
  }
}

/** Which section of the material a module came from, by title overlap. */
export function matchSection<T extends { title: string }>(
  moduleTitle: string,
  sections: T[],
  used: Set<number>,
): number | null {
  const wanted = new Set(tokens(moduleTitle));
  let bestIndex: number | null = null;
  let bestScore = 0;

  for (let index = 0; index < sections.length; index += 1) {
    if (used.has(index)) continue;
    const have = new Set(tokens(sections[index].title));
    if (have.size === 0) continue;
    let overlap = 0;
    for (const token of wanted) if (have.has(token)) overlap += 1;
    const score = overlap / have.size;
    if (score > bestScore) {
      bestIndex = index;
      bestScore = score;
    }
  }

  return bestScore > 0.34 ? bestIndex : null;
}
