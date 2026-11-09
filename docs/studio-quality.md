# Studio outline quality checks

The Studio checks model output before it becomes a draft course. Validation
protects the course structure and time budget; it does not prove that generated
teaching claims are true or that the proposed teaching order is appropriate.
The instructor must review those against the source before publishing.

## Contract

- Model output must contain 3–7 distinct modules. Each needs a title, objective,
  and 1–3 named activities, including an interactive activity. Supported formats
  are reading, simulation, code lab, role play and quiz.
- Module and activity times must be finite positive numbers no greater than 120.
  The model's total must be between half and twice the requested time. Its
  relative times are allocated to whole minutes, with a two-minute minimum per
  activity. Activity minutes total their module, and module minutes total the
  requested 15–120 minutes exactly. If the activities cannot fit, reject the
  result instead of silently dropping activities or exceeding the budget.
- A PDF diagram interpretation needs at least one reading activity so that its
  source page and uncertainty can be retained in the generated course.
- A rejected model draft logs a safe reason and falls back to the built-in
  template. The template uses distinct source headings. When fewer than three
  usable headings are available, it may generate one or two modules and tells
  the instructor to add material for more. It does not duplicate headings to
  satisfy the model's module-count rule.
- The server action independently checks both model and template drafts before
  calling the store. If this final check fails, it reports that no course was
  saved. An empty source is handled as a separate input error.

## Verification

Run `npm run test:studio-quality`, `npm run test:studio-input`,
`npm run typecheck` and `npm run build`. The quality tests cover malformed
model replies, time allocation from 15 to 120 minutes, short sources, visible
fallback, and the server action's no-save guard. They use mocks for the model
and storage and do not access credentials or a database.

On 2026-11-09, a live DeepSeek run read a synthetic architecture diagram and
returned four model-generated modules with a total of exactly 30 minutes. An
isolated local HTTP harness also called the real server action with a model
fixture and in-memory storage: a valid model result was accepted; an unsupported
activity format produced a visible template fallback. A later browser test ran
the full generate/save/review/publish flow against an isolated PGlite database.
The team's shared PostgreSQL environment has not been tested with this change.
