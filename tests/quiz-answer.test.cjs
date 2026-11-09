const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createLoader } = require("./load-ts.cjs");

const load = createLoader();
const { authorContent } = load("lib/author.ts");
const { generateOutline } = load("lib/generate.ts");
const { contentFor } = load("lib/activity-content.ts");

const objective = "Verify the acceptance criteria.";
function makeQuiz(moduleTitle, siblings = [], section = null) {
  return authorContent({ format: "quiz", title: "Checkpoint", moduleTitle, objective,
    courseTitle: "Requirements", siblings, section });
}

test("fallback quizzes mark the actual module objective correct after either option order", () => {
  for (const moduleTitle of ["A", "B"]) {
    for (const siblings of [[], ["Collect stakeholder feedback."], ["Collect stakeholder feedback.", "Review the design."]]) {
      const quiz = makeQuiz(moduleTitle, siblings);
      assert.equal(quiz.kind, "quiz");
      const question = quiz.questions[0];
      assert.ok(question.answer >= 0 && question.answer < question.options.length);
      assert.equal(question.options[question.answer], objective, `${moduleTitle}: ${JSON.stringify(question.options)}`);
      const right = question.options.indexOf(objective);
      const wrong = question.options.findIndex((option) => option !== objective);
      assert.equal(Number(right === question.answer), 1, "selecting the objective must score 1");
      assert.equal(Number(wrong === question.answer), 0, "selecting another option must score 0");
    }
  }
  assert.equal(makeQuiz("A").questions[0].answer, 1);
  assert.equal(makeQuiz("B").questions[0].answer, 0);
});

test("source-based cloze answers still match the missing word", () => {
  const sentence = "The authentication system verifies permissions before allowing database access.";
  const quiz = makeQuiz("Source", [], { title: "Authentication", body: [sentence] });
  const question = quiz.questions[0];
  assert.match(question.prompt, /____/);
  assert.equal(question.prompt.replace("____", question.options[question.answer]).toLowerCase(), sentence.toLowerCase());
});

test("a generated course stores the right fallback answer in its quiz activity", async () => {
  const outline = await generateOutline([{ name: "short.md", pages: 1, text:
    "# Intro\nRead this.\n# Context\nReview this.\n# A\nVerify this." }],
  { title: "Requirements", audience: "non_cs", minutes: 45, useModel: false });
  const module = outline.modules.find((item) => item.title === "A");
  const quiz = module.activities.find((activity) => activity.format === "quiz").payload;
  const question = quiz.questions[0];
  assert.equal(question.options[question.answer], module.objective);
  assert.equal(question.answer, 1);
});

test("the player corrects a recognisable legacy fallback quiz without changing its stored payload", () => {
  for (const siblings of [[], ["Collect stakeholder feedback."], ["Collect stakeholder feedback.", "Review the design."]]) {
    const legacy = structuredClone(makeQuiz("A", siblings));
    legacy.questions[0].answer = 0;
    const activity = { id: "generated-quiz", title: "Checkpoint", format: "quiz", payload: legacy };
    const shown = contentFor(activity, { title: "A", objective }, { title: "Requirements", brief: "" });
    assert.equal(shown.questions[0].options[shown.questions[0].answer], objective);
    assert.equal(shown.questions[0].answer, 1);
    assert.equal(legacy.questions[0].answer, 0, "the stored value must not be changed by reading it");
  }
});

test("legacy correction leaves customised and hand-authored quiz content alone", () => {
  const legacy = structuredClone(makeQuiz("A", ["Collect stakeholder feedback."]));
  legacy.questions[0].answer = 0;
  const course = { title: "Requirements", brief: "" };
  const module = { title: "A", objective };
  const custom = structuredClone(legacy);
  custom.questions[0].explain = "An instructor changed this explanation.";
  assert.strictEqual(contentFor({ id: "custom-quiz", title: "Checkpoint", format: "quiz", payload: custom }, module, course), custom);
  assert.strictEqual(contentFor({ id: "renamed", title: "Checkpoint", format: "quiz", payload: legacy }, { ...module, title: "Renamed" }, course), legacy);
  assert.strictEqual(contentFor({ id: "edited", title: "Checkpoint", format: "quiz", payload: legacy }, { ...module, objective: "A revised objective." }, course), legacy);
  const multiple = structuredClone(legacy);
  multiple.questions.push(structuredClone(multiple.questions[0]));
  assert.strictEqual(contentFor({ id: "multi-quiz", title: "Checkpoint", format: "quiz", payload: multiple }, module, course), multiple);
  const authored = contentFor({ id: "a-5-1", title: "Checkpoint", format: "quiz", payload: legacy }, module, course);
  assert.notEqual(authored.questions[0].prompt, legacy.questions[0].prompt);
  const current = makeQuiz("A");
  assert.strictEqual(contentFor({ id: "new-quiz", title: "Checkpoint", format: "quiz", payload: current }, module, course), current);
});
