# Requirement traceability

Source: COMP5241 *Project Overview* (5 pp.). Each requirement is quoted or paraphrased, then mapped to
what the prototype actually shows today. `[P]` = present in prototype, `[S]` = specified only.

| ID | Requirement (from the brief) | Priority | Prototype evidence | Status |
| --- | --- | --- | --- | --- |
| R1 | "Develop mini-courses with interactive learning contents and activities" | must | `/learn` — one player for all eight formats: module path, quiz grading, code lab with checks, hint ladder, tutor, mastery panel | [P] **built** — see §R1 below |
| R2 | Topics must cover "fundamentals of software engineering", "effective use of AI coding agents", "soft and product skills" | must | `studio.html` outline: M1 fundamentals, M3 agent pairing, M4 design-review role play | [P] |
| R3 | Formats: "text and images, interactive simulations, interactive role play or mock interviews, games/mini-games, AI-narrated animations and slides, online coding" | must | activity taxonomy in `course.html`; six of the eight have a real player (Reading, Simulation, Code lab, Role play, Quiz, Peer review) | [P] 6 of 8; games and narration [S] |
| R4 | Content accessible to non-CS majors *and* valuable to CS graduates | must | audience control in `studio.html`; the learner's `background` picks the register and the hint pacing | [P] **built** |
| R5 | AI provides personalised, tailored content to different backgrounds and goals | must | `lib/activity-content.ts` serves non-CS an analogy-first lesson and CS the formal rule; hint unlocks after 1 failure (non-CS) or 2 (CS); mastery panel reads the event log | [P] **built** |
| R6 | Instructors customise learning contents and activities, manually or using AI | must | course editor: every module/activity field is a form that writes to Postgres; studio outline editing | [P] **built** |
| R7 | Instructors generate new mini-courses from "their own topics, requirements, and teaching content" | must | `/studio`: upload PDF/MD/TXT → parse → outline → draft course in Postgres | [P] **built** — see §R7 below |
| R8 | Import students into courses and track participation and engagement | must | `/courses/[id]` roster import (CSV), per-learner progress from events, `/insights`, CSV export | [P] **built** — see §R8 below |
| R9 | Generate mini-courses for other subjects/domains | should | `/path` marks a week it cannot fill as a `gap` and sends it to `/studio` | [P] **built** |
| R10 | Learners generate their own topics and self-learning paths | must | `/path` — goal, domain, level, hours, weeks → a sequenced `LearningPath` with per-step status | [P] **built** — see §R10 below |
| R11 | Multiple prototypes for brainstorming and validation, then one integrated final app | must | round 1 wireframes → round 2 hi-fi prototype (this repo); integration in weeks 9–11 | [P] |
| R12 | Each member demonstrates sufficient contribution | must | ownership table in `midterm-update.md`; issues and PRs per feature | [P] process |
| R13 | Public GitHub repository with code, documents and deliverables | must | this repository | [P] |
| R14 | Meet stakeholders/users, collect requirements and feedback | must | interview notes to be added in week 8/9; three prototype revisions trace to feedback | [S] |
| R15 | Study Anthropic's AI Fluency framework and reflect on its use | must | `ai-usage-log.md`, section in the final presentation | [P] docs |
| R16 | Deploy to a publicly accessible platform | must (week 11) | build and deploy pipeline ready; production URL lands week 11 | [S] |
| R17 | 5–8 minute demo video, slides, final report, user manuals for admin/instructor/student | must (week 11) | not yet | [S] |

## Gaps we are consciously carrying

1. **Two activity formats are specified but not built** — mini-games and AI-narrated slides. Both are
   modelled in the activity taxonomy so the schema will not need to change, and the player says so on
   the card rather than showing an empty one.
2. **Student import is CSV only.** Moodle's roster export is CSV with a header row, which the importer
   accepts as-is; the OAuth handshake is not built. That is an integration problem, not a UI problem,
   and shipping the CSV first is the honest order.
3. **Admin role is minimal by design.** The brief implies a third role but never
   specifies it, so we built the two things a registry actually does — create a
   cohort, assign its instructor — and stopped. It is reachable at `/admin`,
   guarded on the server, and deliberately has no timetabling, reporting or
   grade export. "We scoped it" is a better answer than "it is half-built".
4. **No public URL yet.** The app builds, runs and is deployable, but the Vercel
   project is created in week 11 alongside the demo video. Until then, reviewers
   run it locally with `npm install && npm run dev` (see DEPLOYMENT.md).
5. **The interface is English only.** This was considered and dropped: the brief
   asks for content that adapts to the learner, not a UI language switch, and the
   screens are generated from `prototype/` — translating them means two copies of
   every string in six screens, where a copy edit has to be made twice. The
   *Adaptation rules* card says "English only — switching is not built" rather
   than advertising a toggle that does not exist.
6. **No password, no provider.** Sign-in is a cookie that names a demo user. Every
   route reads the role off that cookie on the server, so the access rules are
   real even though the credential is not; swapping in a provider replaces the
   login page and nothing behind it.

## R7 in detail — what "generate a course" actually does

The studio's "Generate outline" button is not a mock. The path from an upload to
a draft course that the editor can open is:

```
POST /studio (multipart, ≤16 MB)
  → lib/generate.ts  readSource()        unpdf → text, or UTF-8 for .md/.txt/.csv
  →                  toHeadings()        slide-aware segmentation, not paragraph splitting
  →                  generateOutline()   model first, template as the fallback
  → lib/store.ts     createCourseFromOutline()
                                         one transaction: course + modules + activities + ai_runs
  → components/StudioWorkspace.tsx       outline rendered back into the same screen,
                                         "Open in editor" → /courses/[id]
```

Decisions worth defending in a viva:

- **Two generators, one seam.** With `OPENROUTER_API_KEY` set, `completeJson` asks
  a model for the module sequence and `coerceModules` validates the reply before
  it is saved. Without a key — or when every model in the chain fails — the
  built-in template runs instead. Both paths return the same type, so nothing
  downstream knows or cares which one ran. `GeneratedOutline.template` records it.
- **The fallback is not a silent one.** The studio's generation log names the
  model that answered, or says "fell back to the built-in template". The note in
  the right-hand column changes with it. A draft that cannot be traced to how it
  was made is not auditable, and the brief asks for an auditable log.
- **The model is given a sketch, not the deck.** Titles plus the first two lines
  under each, capped at 45 headings. Sending the whole text costs tokens and
  makes the model quote bullets instead of designing a sequence.
- **Validation is where the trust stops.** Formats are checked against the enum,
  minutes are rescaled so each module's activities add up to its stated length,
  and an unparseable or out-of-shape reply is rejected outright rather than
  coerced into rows the editor cannot render.
- **The ceiling is honest.** Free-tier models are rate-limited upstream, which is
  why the chain has two entries and why the template exists at all. Measured on
  the COMP5241 SDLC deck (57 pages): 11–27 s end to end, 5 modules, 9–10
  activities, 45 minutes.

## R1 in detail — one player, eight formats

`/learn` is a single server page plus one client component (`components/LearnPlayer.tsx`). It resolves
the learner (a real session, or a learner an instructor is previewing), reads `getLearnerView`, and
renders the activity the URL asks for. The eight formats share the shell and differ only in the body:

| Format | What the learner does | How it is marked complete |
| --- | --- | --- |
| Reading | reads authored blocks, can open the tutor | immediately |
| Quiz | answers every question, then checks | every question answered |
| Code lab | edits a starter, presses "Run checks" | every check passes |
| Role play | writes a reply the reviewer pushes back on | 20+ characters written |
| Simulation | picks one of three moves | a move is chosen |
| Peer review | ticks the defects they can find in a diff | at least one finding |
| Game / narrated slides | — | modelled, not built; the card says so |

Three decisions worth defending:

- **Progress is a query.** Completing an activity appends an `activity_completed` event and nothing
  else; `getLearnerView` counts events. There is no `progress` column to fall out of sync, and the
  analytics screen cannot disagree with the player because they read the same rows.
- **The hint has a price.** The page has always claimed "the hint waits until you have tried twice".
  It now enforces it: one failed attempt on the non-CS track, two on the CS track, with the button
  disabled and labelled until then.
- **The tutor refuses.** `askTutorAction` scores the question against the passages in *this* activity
  and returns the best one with its source; when nothing matches it says so and names what the activity
  is about. An answer invented to look helpful is worse than no answer in a course that is graded.

## R8 in detail — participation is measured, not asserted

`learnerProgress(courseId)` and `courseAnalytics(courseId, range)` are the only two readers of the
event log, and every screen that talks about a learner uses one of them.

- **The roster** on `/courses/[id]` shows completed/total, minutes done, last active and a signal
  (`Finished`, `Active 2d ago`, `Idle 3 days`, `Stuck on …`) per learner.
- **The import** accepts `name,email` or a bare email per line, creates people who do not exist,
  skips people already enrolled, and records `importedFrom = csv` so the row can say where it came from.
- **The export** (`/courses/[id]/export`) is the same query as a CSV — the file and the table cannot
  disagree because they are one function.
- **`/insights`** adds weekly engagement, completion by format, one attributed insight, and a nudge
  list that writes a `nudge_sent` event rather than pretending to send mail.

## R10 in detail — a path, not a playlist

`designPath()` takes the goal, domain, level, hours per week and number of weeks, plus the published
library, and returns one step per week. With a model configured it asks for the sequence; without one
it scores every course by goal-word overlap and audience fit, takes the best `weeks` of them and orders
them shortest-first.

The part that matters is what it does when the library cannot fill a week: it writes a step with
`courseId = null`, a generated title and the sentence explaining what that week would teach. The UI
marks it `gap` and offers "Generate this course" instead of a link to a course that will waste the
week. A path that silently repeats courses, or pads itself with whatever is left, is the failure mode
this design exists to avoid.
