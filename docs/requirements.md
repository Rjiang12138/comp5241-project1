# Requirement traceability

Source: COMP5241 *Project Overview* (5 pp.). Each requirement is quoted or paraphrased, then mapped to
what the prototype actually shows today. `[P]` = present in prototype, `[S]` = specified only.

| ID | Requirement (from the brief) | Priority | Prototype evidence | Status |
| --- | --- | --- | --- | --- |
| R1 | "Develop mini-courses with interactive learning contents and activities" | must | `learn.html` — module path, code lab, hinting, tests | [P] mock |
| R2 | Topics must cover "fundamentals of software engineering", "effective use of AI coding agents", "soft and product skills" | must | `studio.html` outline: M1 fundamentals, M3 agent pairing, M4 design-review role play | [P] |
| R3 | Formats: "text and images, interactive simulations, interactive role play or mock interviews, games/mini-games, AI-narrated animations and slides, online coding" | must | activity taxonomy in `course.html` (Reading, Simulation, Code lab, Role play, Quiz) | [P] 5 of 7; games and narration [S] |
| R4 | Content accessible to non-CS majors *and* valuable to CS graduates | must | audience control in `studio.html`; three tutor registers in `learn.html` | [P] |
| R5 | AI provides personalised, tailored content to different backgrounds and goals | must | adaptation rules in `course.html`; mastery panel in `learn.html` | [P] mock |
| R6 | Instructors customise learning contents and activities, manually or using AI | must | studio outline editing, regenerate, shuffle, per-activity settings | [P] |
| R7 | Instructors generate new mini-courses from "their own topics, requirements, and teaching content" | must | `/studio`: upload PDF/MD/TXT → parse → outline → draft course in Postgres | [P] **built** — see §R7 below |
| R8 | Import students into courses and track participation and engagement | must | cohort table with progress, last active, status; import from Moodle / CSV | [P] |
| R9 | Generate mini-courses for other subjects/domains | should | `path.html` — "Generate a new course" for any domain | [P] entry point |
| R10 | Learners generate their own topics and self-learning paths | must | `path.html` — goal, level, time budget → sequenced path | [P] |
| R11 | Multiple prototypes for brainstorming and validation, then one integrated final app | must | round 1 wireframes → round 2 hi-fi prototype (this repo); integration in weeks 9–11 | [P] |
| R12 | Each member demonstrates sufficient contribution | must | ownership table in `midterm-update.md`; issues and PRs per feature | [P] process |
| R13 | Public GitHub repository with code, documents and deliverables | must | this repository | [P] |
| R14 | Meet stakeholders/users, collect requirements and feedback | must | interview notes to be added in week 8/9; three prototype revisions trace to feedback | [S] |
| R15 | Study Anthropic's AI Fluency framework and reflect on its use | must | `ai-usage-log.md`, section in the final presentation | [P] docs |
| R16 | Deploy to a publicly accessible platform | must (week 11) | build and deploy pipeline ready; production URL lands week 11 | [S] |
| R17 | 5–8 minute demo video, slides, final report, user manuals for admin/instructor/student | must (week 11) | not yet | [S] |

## Gaps we are consciously carrying into week 9

1. **Two activity formats are specified but not built** — mini-games and AI-narrated slides. Both are
   modelled in the activity taxonomy so the schema will not need to change.
2. **Student import is a UI mock.** Real Moodle integration is an OAuth/CSV problem, not a UI problem;
   we will ship CSV first.
3. **Admin role is minimal by design.** The brief implies a third role but never
   specifies it, so we built the two things a registry actually does — create a
   cohort, assign its instructor — and stopped. It is reachable at `/admin`,
   guarded on the server, and deliberately has no timetabling, reporting or
   grade export. "We scoped it" is a better answer than "it is half-built".
4. **No public URL yet.** The app builds, runs and is deployable, but the Vercel
   project is created in week 11 alongside the demo video. Until then, reviewers
   run it locally with `npm install && npm run dev` (see DEPLOYMENT.md).
5. **The interface is not translatable; the content is.** The prototype's
   "Language · EN · 繁中 · 简中" row in *Adaptation rules* is a **content** rule,
   not a UI toggle: it decides which language generated material is written in,
   and it reads `users.locale` (`en` / `zh-Hant` / `zh-Hans`, already on every
   row). Translating the chrome is a different job and is not in the brief — it
   would mean two copies of every string across six screens that are generated
   from `prototype/`, so a copy edit would have to be made twice. If it is ever
   wanted, the place to do it is `tools/html_to_tsx.py`, not the components.

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
