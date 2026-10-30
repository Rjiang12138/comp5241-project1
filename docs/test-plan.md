# Test plan

What we test, at which level, and what the resulting report is allowed to claim.
The point of writing this down before the tests is that "we tested it" is not a
claim anyone can check; "these 24 cases, 21 passing, 3 open defects" is.

Owner: R3 平台. Reviewed by the whole group at the week 10 standup.

---

## 1. Scope

In scope: the course editor, the admin console, session and role handling, and
the deployed build. Those are the surfaces R3 owns, and they are the ones that
break silently — a wrong pill colour is visible, a lost edit is not.

Out of scope for this plan (owned elsewhere, tested by their owners): LLM output
quality, the code execution sandbox, and the analytics numbers. Quality of
generated content is evaluated by the prompt review in `docs/ai-usage-log.md`,
not by assertions.

## 2. Levels

| Level | Tool | What it is for | Runs |
| --- | --- | --- | --- |
| Static | `tsc --noEmit` | type errors, the cheapest bug class to catch | every push (CI) |
| Build | `next build` | a page that does not compile, or a route that breaks the bundle | every push (CI) |
| Unit | Vitest | pure logic: ordering, minutes roll-up, version bumping | every push (week 10) |
| End-to-end | Playwright | the flows a marker will actually click | every PR against the preview URL (week 10) |
| UAT | two real users, scripted | whether the flow makes sense to someone who did not build it | week 10 and week 11 |
| Exploratory | manual, 20 minutes | the things no case anticipated | before each release |

The order matters. A bug caught by `tsc` costs a minute; the same bug caught in
UAT costs a session with a participant and a rewrite.

## 3. Cases

Status legend: **P** pass · **F** fail (see defect log) · **—** not written yet.

### 3.1 Course editor (R6, R7)

| ID | Requirement | Scenario | Expected | Level | Status |
| --- | --- | --- | --- | --- | --- |
| CE-01 | R6 | Rename a module and click away | New title persists after reload | e2e | — |
| CE-02 | R6 | Add a module | Appears last, numbering stays 01…0n | e2e | — |
| CE-03 | R6 | Move a module down, then up | Returns to the original order | e2e | — |
| CE-04 | R6 | Delete a module | Module and its activities are gone; later modules renumber | e2e | — |
| CE-05 | R6 | Add an activity to a module | Row appears with default format and 8 min | e2e | — |
| CE-06 | R6 | Change an activity format | Pill and select agree after reload | e2e | — |
| CE-07 | R6 | Set activity minutes to 0 or a negative number | Rejected; previous value kept | unit | — |
| CE-08 | R3 | Course total minutes equals the sum of activity minutes | Header matches the table | unit | — |
| CE-09 | R3 | Publish | Status becomes Published, version increments, a version row is added | e2e | — |
| CE-10 | R3 | Publish twice | Two version rows, version +2, no duplicates | e2e | — |
| CE-11 | R6 | Save course settings with an empty title | Falls back to "Untitled course", never a blank heading | unit | — |
| CE-12 | R3 | Open a course id that does not exist | 404 page, not a crash | e2e | — |

### 3.2 Admin (R8, admin minimum)

| ID | Requirement | Scenario | Expected | Level | Status |
| --- | --- | --- | --- | --- | --- |
| AD-01 | admin | Create a cohort with a code and instructor | Row appears with the chosen instructor | e2e | — |
| AD-02 | admin | Create a cohort with an empty code | Form does nothing, no empty row | unit | — |
| AD-03 | admin | Reassign a cohort's instructor | Cohort and its courses show the new owner | e2e | — |
| AD-04 | admin | Learner count on the cohort row | Equals the enrolments for that cohort | unit | — |
| AD-05 | admin | Instructor opens `/admin` | Redirected to `/login`; no data rendered | e2e | — |
| AD-06 | admin | Admin opens `/admin` | Console renders | e2e | — |

### 3.3 Access and session

| ID | Requirement | Scenario | Expected | Level | Status |
| --- | --- | --- | --- | --- | --- |
| AU-01 | R3 | No cookie, open `/courses` | Renders as the demo instructor | e2e | — |
| AU-02 | R3 | Sign in as admin, then open `/courses` | Sidebar shows Admin, name updates | e2e | — |
| AU-03 | R3 | Sign out | Cookie cleared, `/login` renders | e2e | — |

### 3.4 Deployment smoke (run on the preview URL, every merge)

| ID | Scenario | Expected |
| --- | --- | --- |
| SM-01 | `/` | Landing renders, no console error |
| SM-02 | All six routes | 200, no blank page |
| SM-03 | `/courses` | Six courses, owner names, version pills |
| SM-04 | Edit a module on the preview | Change survives a reload within the session |
| SM-05 | Bundle size | First load JS under 250 kB per route |

## 4. End-to-end suite (week 10)

Playwright, one spec per flow, run against the preview deployment:

```
e2e/editor.spec.ts      CE-01…CE-06, CE-09, CE-12
e2e/admin.spec.ts       AD-01, AD-03, AD-05, AD-06
e2e/session.spec.ts     AU-01…AU-03
e2e/smoke.spec.ts       SM-01…SM-03
```

Install once: `npm i -D @playwright/test && npx playwright install --with-deps`.
Tests run against `PLAYWRIGHT_BASE_URL`, defaulting to `http://localhost:3000`.

Rule we keep from the mid-term: **a test must fail before the feature exists.**
A spec written after the implementation, against an implementation that already
works, proves nothing about whether it would catch a regression.

## 5. UAT

Two rounds, because one round is a demo with extra steps.

| Round | When | Who | What they do |
| --- | --- | --- | --- |
| 1 | week 10, after the editor is real | 3 classmates, at least one non-CS | 25-minute scripted task, think-aloud |
| 2 | week 11, before the demo video | 2 users who did not see round 1 | The same script plus the two flows round 1 exposed |

**Script (round 1).** The participant is an instructor who has just inherited a
course and has to change it before Monday:

1. Open the platform and find "Software Engineering Foundations".
2. Module 3 runs long. Remove one of its activities.
3. Add a module called "Code review in practice" and put one reading activity in it.
4. The cohort is now 30 students. Update the time budget to 50 minutes.
5. Publish, and tell us what you expect students to see.

We record: time per step, where they hesitate, what they say out loud, and
whether they finish without help. **We do not explain the interface during the
task** — if it needs explaining, that is the finding.

Exit criteria for round 1: every participant completes steps 1–5 unaided, or the
failure is written up and scheduled as a defect. "They got there eventually
after I showed them" counts as a failure.

## 6. Defect log

Filed as a GitHub issue with the bug template, labelled `type:bug` and
`severity:blocker|major|minor|cosmetic`. The report summarises them in a table:

| ID | Found by | Severity | Status | Fixed in |
| --- | --- | --- | --- | --- |
| D-01 | `curl` POST to `/path` returned 200 with an empty `LearningPath` table | blocker | fixed | §8.7 — the prototype script owned the click |
| D-02 | `/learn` "Complete and continue" left `events` unchanged | blocker | fixed | §8.5 — the button was disabled by a state the test had not set |
| D-03 | `/insights` 7-day view reported "0 of 24 finished every activity" | major | fixed | §8.6 — progress is a state, not a window |
| D-04 | `/insights` median attempts read 0.0 | major | fixed | §8.6 — attempts keyed by enrolment + activity |
| D-05 | `/insights` blamed quizzes for a drop that was positional | major | fixed | §8.6 — position measured before difficulty is claimed |
| D-06 | Preview learner changed identity on every save | major | fixed | §8.5 — pinned in a cookie |
| D-07 | Hint button ignored the pacing rule the page described | major | fixed | §8.5 — threshold enforced per track |
| D-08 | "Assign" on `/admin` wrote the row but the select kept the old instructor | major | fixed | keyed the control so it re-mounts with the saved value |
| D-09 | `/courses/[id]` audience and format selects had the same stale-value bug | major | fixed | same fix, same commit |
| D-10 | `/courses/[id]` printed four statistics and a learner table that were fixtures | blocker | fixed | §8.8 — computed from `events` |
| D-11 | "Export CSV" and "Compare vN → vN+1" were disabled placeholders | minor | fixed | §8.8 — real routes |
| D-12 | Roster import was promised by `/admin` copy and did not exist | major | fixed | §8.8 |

D-01 and D-02 are the same defect twice: a test that trusted the screen instead
of the database. Both were found by reading the table, not the toast.

A defect is only "fixed" when the case that found it passes on the preview URL,
not when the code is merged.

## 7. What the test report will contain

Written in week 11, from this plan, with no invented numbers:

1. Cases planned / written / passing, per area — from the tables above.
2. Defects found, fixed, open — from the issue labels, not from memory.
3. UAT: participants, completion rate per step, and the three changes we made
   because of what they did.
4. What we deliberately did not test, and why.
5. One thing that surprised us.

Point 5 is the part that is hard to fake and easy to grade.

## 8. Current status

Week 9. No automated suite exists yet. `tsc` and `next build` run in CI on every
push, and the smoke cases (SM-01…SM-05) are run by hand on the preview before a
merge. Everything marked `—` above is scheduled, not done — and the report will
say so.

### 8.1 Manual smoke run against the Neon database

Run once, by hand, after the store moved from a JSON file to Postgres. Command
output is reproduced here because "it worked" is not evidence.

| Check | Result |
| --- | --- |
| `tsc --noEmit` | no output, exit 0 |
| `next build` | 11 routes, first load JS 103–107 kB (SM-05: under the 250 kB budget) |
| `GET` all ten routes as admin | 200, 200, 200 … 200 (SM-02) |
| `GET /admin` as instructor | 307 → `/login` (AD-05) |
| `GET /admin` as admin | 200 (AD-06) |
| `/courses` | six course cards with owner names and version pills (SM-03) |
| Add a module through the form, then read the row back | new row present, position 6 (SM-04) |
| Delete that module | row gone, remaining modules renumbered 1–5 with no gap (CE-04) |
| Sign out | 303 with `praxis_uid=; Expires=Thu, 01 Jan 1970` (AU-03) |

Not covered by this run: browser console errors (SM-01) were not checked — the
run used `curl`, which executes no JavaScript. That needs the Playwright suite.

Two findings from the run, both fixed before it was signed off:

- The sidebar's "Cohorts" item pointed at `course.html` in the prototype, which
  the route map sends to the catalogue — so the item never opened a cohort
  screen. It now resolves per role through `lib/nav.ts`.
- Three ported screens rendered the prototype's hard-coded account
  ("Dr. R. Kwok") instead of the signed-in one. The sidebar footer is now
  `components/SideUser.tsx`, which reads the session.

Still open, and deliberately not fixed in this pass: "Export report" on
`/insights` is a `<button>` with no handler, exactly as it was in the
prototype. It belongs to R5's screen, not R3's.

### 8.2 Which controls are actually wired

A `curl` POST proves the server accepts a write. It does not prove the browser
sends one. The table below was produced by driving a real Chrome over the
DevTools Protocol and classifying every `button`, `a`, `input`, `select` and
`textarea` on the page:

- **wired** — an anchor with a real `href`, or a control inside a form that
  carries a server-action field (`$ACTION_ID_…`) or a GET action;
- **client** — a hydrated React control whose behaviour lives in the browser
  (segmented controls, quiz options, the player's completion button);
- **disabled** — declared inert, with a `title` saying why;
- **dead** — none of the above.

Production React does not expose handlers on the DOM node, so "client" cannot be
proven by inspection. Each of those controls was driven by hand and its effect
checked in Postgres, which is the evidence listed in §8.5–§8.7.

| Screen | Controls | Wired | Client | Disabled | Dead |
| --- | --- | --- | --- | --- | --- |
| `/` landing | 8 | 8 | 0 | 0 | 0 |
| `/studio` | 26 | 19 | 7 | 0 | 0 |
| `/courses` catalogue | 17 | 17 | 0 | 0 | 0 |
| `/courses/[id]` editor | 299 | 297 | 0 | 2 | 0 |
| `/courses/[id]/versions` | 15 | 15 | 0 | 0 | 0 |
| `/insights` | 45 | 45 | 0 | 0 | 0 |
| `/path` | 58 | 54 | 0 | 4 | 0 |
| `/learn` (role play) | 21 | 14 | 7 | 0 | 0 |
| `/settings` | 15 | 15 | 0 | 0 | 0 |

**Zero dead controls.** The six that are disabled say why: the editor's "Move up"
on the first module and "Move down" on the last, and `/path`'s four "Swap"
buttons when every published course is already in the path.

This table replaces an earlier one that read *"four surfaces are real, three are
still the prototype"*. That was true in week 9 and is not true now: `/learn`,
`/insights` and `/path` were rebuilt against the event log, and the transition is
worth recording because of *how* the old ones were inert.

The prototype behaviour lived in one place — `components/PrototypeScripts.tsx` —
which looked up the ids the ported markup already emitted and animated them.
That was fine while the screens were static, and actively harmful once they were
not:

- `#genBtn` ran a canned "Draft ready · 5 modules" animation *instead of* the
  server action, because it had attached its own click handler to the same
  button. The first end-to-end run "passed" in 0.5 s with zero module rows.
- `#buildPath` did the same on `/path`: it faded the timeline, printed
  "4-step path saved to your workspace", and flipped the button to "Regenerate
  path" — while the `LearningPath` table stayed empty. A `curl` POST to the same
  form returned 200 with the page unchanged, which is what sent us looking.

Both blocks are gone, and so is the file: the last of it was the toast helper and
the segmented-control handler, neither of which had a caller. **A fake that wins
the race against the real thing is worse than no fake at all**, and a fake that
merely decorates is still a lie about what the product does.

Six prototype controls on `/studio` were removed rather than wired: "Shuffle",
"+ Add module / Suggest", "Compare with last draft", "Send for review", "Fix
accessibility gap", and the invented finding "Captions missing for 2 narrated
slides". None had a behaviour to recover. The pedagogy panel is now computed from
the outline (four checks: objectives map to activities, module count under seven,
retrieval practice last, a hands-on activity in every module), so its score is a
fact rather than a typographic decoration.

### 8.3 Demo reset button (`/settings`)

`npm run db:reset` is fine from a terminal and useless in front of an audience.
The button is the same fixture, driven from the browser. Evidence, in the order
it was collected:

| Check | Result |
| --- | --- |
| Button before typing anything | `disabled`, title "Type RESET first" |
| Button after typing `nope` | still `disabled` |
| Button after typing `RESET` | enabled |
| Click, real Chrome (no `curl`) | 303 → `/settings?reset=done`, banner visible in 3.6 s |
| Row changed by hand before the click | back to the fixture title afterwards |
| Counts after the click | 27 users · 2 cohorts · 6 courses · 20 modules · 22 activities · 24 enrolments |
| Same POST with `confirm=reset please` | 303 → `/settings?reset=unconfirmed`, nothing deleted |
| Same POST as an instructor | 303 → `/login` (the guard, not the UI, is what stops it) |
| `npm run db:seed` after the refactor | unchanged output — the CLI and the button share `lib/demo-data.ts` |

Two things this exposed, both worth recording because they were bugs in the
test as much as in the code:

1. The first implementation awaited 23 statements one at a time. Against a
   database in another region that is 23 round trips, measured at 14.8 s —
   long enough that the button looked hung. One `TRUNCATE` plus one batched
   transaction brought it to 5.7 s cold, ~3.6 s in the running app.
2. The harness searched the page for the string "Demo data restored". The
   banner's class sets `text-transform: uppercase`, and `innerText` returns the
   *rendered* text, so it was looking for "DEMO DATA RESTORED" and finding
   nothing. For several rounds this was read as "the action never returns".
   A test that fails for its own reasons is indistinguishable from a product
   bug until you read what it actually compared.

### 8.4 Upload a lecture PDF → a draft course (`/studio`)

The flow under test is the one R7 promises: an instructor brings their own
material and gets something they can edit. Driven in a real Chrome over CDP —
the PDF is attached with `DOM.setFileInputFiles`, so the file goes through the
browser's own form submission rather than a hand-built request.

| Check | Result |
| --- | --- |
| Attach `2 - Software Development Lifecycle-1.pdf` (7.9 MB, 57 pages) | chip renders name and size; card head reads "1 file" |
| Press "Generate outline" | server action runs; button disabled and labelled "Generating…" |
| Wall clock, model path | 11.3 s (first model) / 27.1 s (after one fallback) |
| Status line afterwards | "Draft ready · 5 modules · 9 activities · 45 min" |
| Module rows rendered | 5, titles grounded in the deck (`Software Development Life Cycle (SDLC)` … `Working with AI Coding Agents`) |
| Generation log | 5 steps with real timings; step 3 names the model that answered |
| Rows in Postgres | `course` 1 · `module` 5 · `activity` 9–10 · `ai_runs` 1 (`outline` / `outline-json-v1` / model / 11 748 ms) |
| `/courses/<new id>` fetched cold | contains every generated module and activity title in the server-rendered HTML |
| Pedagogy panel | 3 / 4, with the failing check naming the actual reason (last module is a simulation, not retrieval) |
| Brief-only submission (no file) | supported: the brief is used as the source, course is created |
| Upload with no brief and no file | inline error under the button, nothing written |

Four defects this found, all of which had to be fixed before the table above
could be produced:

1. **`Body exceeded 1 MB limit` (413).** Next.js caps server-action request
   bodies at 1 MB. Every lecture deck is 3–8 MB, so the action never ran and the
   browser got a 413 that renders as a generic error. Fixed in `next.config.ts`
   with `experimental.serverActions.bodySizeLimit: "16mb"`; the per-file 12 MB
   check in the action stays, because that is the layer that can say *which*
   file was too big.
2. **The prototype's fake generation won the click.** See §8.2 — the simulation
   handler in `PrototypeScripts.tsx` was bound to the same `#genBtn`.
3. **Free-tier models rate-limit upstream.** `google/gemma-4-*:free` returns 429
   from the shared pool, and the reasoning-heavy free models return `200` with
   empty `content` because they spend the whole token budget thinking. Both are
   treated as failures; the chain moves to the next model and, if all fail,
   falls back to the template rather than saving an empty course.
4. **Module minutes did not add up.** A model would return a 10-minute module
   whose two activities were 4 + 4. `scaleActivities` rescales to the stated
   length so the editor, the learner path and the pedagogy check agree.

The prompt was measured before it was trusted. Four free models were asked for
the same outline; two produced grounded, usable sequences (45 minutes exactly,
titles traceable to the slides), two produced nothing usable. The two that
worked are the chain; the two that did not are documented in `lib/llm.ts` so
nobody re-adds them by reading a leaderboard.

### 8.5 The learner runtime writes events (`/learn`)

The player is the one screen where "it renders" and "it works" are furthest
apart: eight activity formats, each with its own way of being finished. The test
is not that the button is clickable but that finishing an activity appends a row
and that the row changes the next page.

| Check | Result |
| --- | --- |
| Baseline before the run | `events` = 275 (`started` 98 · `completed` 98 · `attempted` 8 · `tutor_asked` 69 · `hint` 2) |
| Pick a simulation option, then "Complete and continue" | `events` = 278: `attempted` ×2, `completed` ×1 |
| Progress after the click | `1 / 7` → `2 / 7`, 14% → 29%, next activity loaded |
| Opening an activity | one `activity_started` per (enrolment, activity), written on render |
| Re-opening the same activity twice | still one row — `recordStart` is idempotent |
| Hint button on a fresh code lab | `disabled`, label "Hint after 2 attempts" |
| Hint after one failed "Run checks" (CS track) | still disabled; after the second failure it unlocks |
| Hint on the non-CS track | unlocks after one failure, which is what the page has always claimed |
| Quiz grading | answers are checked per question; "Complete" stays disabled until every question is answered |

Two defects, both fixed:

1. **The preview changed identity on every save.** `previewLearner` picked the
   enrolment closest to halfway, so completing an activity changed the numbers,
   the next request picked somebody else, and the banner went from "Previewing as
   Jun Hao Lim" to "Omar Haddad" without anyone asking. The choice is now pinned
   in a `praxis_preview` cookie and there is a "Next learner" control for when you
   *do* want to change it.
2. **The pace rule existed only in a paragraph.** The player told every learner
   "the hint waits until you have tried twice" and then offered the hint
   immediately. It now enforces one failure on the non-CS track and two on the CS
   track, and says so on the disabled button.

### 8.6 Analytics is a query, not a counter (`/insights`)

Every number on the screen is computed from `events` on the request that renders
it, so the screen and the player cannot disagree about what happened.

| Check | Result |
| --- | --- |
| Course opened cold | the busiest course, not the alphabetically first one (which has no learners) |
| Headline stats, all time | 24 learners · 96% active this week · 59% average progress · 2 of 24 finished · median 2.0 attempts · 69 tutor questions |
| Weekly engagement | 0 · 0 · 0 · 21 · 46 · 71 · 92 · 96 |
| Completion by format | Simulation 96% · Reading 88% · Code lab 63% · Peer review 46% · Role play 25% · Quiz 8% |
| The insight | "Learners stop before module 5" — attributed to attrition because every quiz in the course sits in module 5 |
| Range = 7 days | `?range=7`; attempts and questions are windowed, progress is not |
| Export | `GET /insights/export?course=c-sef&range=7` → `text/csv`, `Content-Disposition: attachment` |
| Nudge | writes a `nudge_sent` row; `Dismiss` hides the card for 7 days via cookie and can be undone |

Four defects this found:

1. **The insight was confidently wrong.** "Quiz finishes 8% of the time" was
   rendered as "quizzes are hard" when the quiz is simply the last activity in
   the course. Position and difficulty are different claims; the code now
   measures where the weak format sits before choosing which one to make.
2. **Median attempts read 0.0.** Attempts were keyed by `activityId` alone and
   then filtered by the `since` window, so retries outside the window vanished.
   Keyed by `enrolment:activity` and counted inside the window it reads 2.0.
3. **"0 of 24 finished every activity" on the 7-day view.** Progress is a state;
   a state does not reset because the instructor picked a range. The windowed
   read now feeds attempts and questions only.
4. **A fixed term start made the fixture look dead.** Events anchored to
   2026-09-14 produced "0% active this week". The fixture is now generated
   relative to `Date.now()`, which is what a demo cohort should look like.

### 8.7 The path builder sequences real courses (`/path`)

| Check | Result |
| --- | --- |
| Press "Design my path" in a real browser | 303 → `/path?generated=1`; the button reads "Designing…" while the model runs |
| Row written | `LearningPath` 1 · `PathStep` 4, `model = poolside/laguna-s-2.1:free` |
| Steps | Week 1 Software Engineering Foundations (library) · Week 2 HTTP, APIs and Data Modeling (gap) · Week 3 Databases, SQL and Authentication (gap) · Week 4 Interview Prep and System Design Basics (gap) |
| Gaps | marked `gap` in the timeline and linked to `/studio`, not to a dead course |
| "Mark done" | step status `not_started` → `done`, progress 100%, button flips to "Reopen" |
| "Swap" | step 2 replaced with the one unused published course, `detail` ends "· swapped in" |
| "Swap" when every course is already used | `disabled`, title "Every published course is already in this path" |
| "Start" | enrols the learner and redirects to `/learn?course=…` |
| "Start over" | deletes the path row; the page returns to "No path yet" |

The first version of this screen was inert in the worst way: the prototype script
faded the timeline, printed "4-step path saved to your workspace", and flipped the
button to "Regenerate path" — all with an empty `LearningPath` table. The toast
was the only evidence, and it was fabricated.

### 8.8 The course editor reports the cohort, not a fixture

The editor used to print four hard-coded statistics and a per-learner table keyed
by user id — the same numbers on every course, whatever anyone had done. They are
now `courseAnalytics()` and `learnerProgress()` over the same event log.

| Check | Result |
| --- | --- |
| Headline stats | 24 enrolled · 96% active this week · 59% average progress · 2 finished · median 27 min completed · 22 not finished |
| Cohort table | Mei Wong 7/7 Finished · Arjun Lee 6/7 Active 2d ago · Sara Khan 5/7 Idle 3 days — each row a query |
| Export CSV | `GET /courses/c-sef/export` → 24 rows, `Content-Disposition: attachment` |
| Publish v4 | `CourseVersion` row written with a `snapshot` of the tree in the same transaction |
| Rename a module, publish v5, open Versions | "v4 → v5 · 1 change · renamed module · Module 4 — was 'Design review role play' · now 'Design review role play (edited)'" |
| Version with no snapshot (v1–v3) | says so instead of rendering an empty diff |
| Import a roster | paste `Test Person,test.person@example.edu` → 303 `?roster=1`; user created, enrolment `importedFrom = csv`; re-importing the same line adds nobody |
| Adaptation rules card | shows the rule that is enforced (hint after 1 or 2 failures), the real non-CS count, and marks language and captions as not built |

The roster import exists because the admin screen has claimed "students import
themselves from a Moodle roster or CSV, driven from the course page" since week
8, and until now there was no such control. Either the sentence goes or the
control does; the control was cheaper than the apology.
