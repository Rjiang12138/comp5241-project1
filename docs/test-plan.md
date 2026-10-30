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
DevTools Protocol and counting, per screen, how many controls are bound to a
server action and how many are inert prototype markup.

| Screen | Controls | Wired | Not wired | Verdict |
| --- | --- | --- | --- | --- |
| `/courses/[id]` editor | 57 | 55 | 2 | real: every module/activity edit writes to Postgres |
| `/admin` | 5 | 5 | 0 | real |
| `/courses` catalogue | 17 | 17 | 0 | links only, nothing to wire |
| `/studio` | 20 | 18 | 2 | brief form and the whole pipeline are real; "Preview" and "Publish to cohort" land on the catalogue |
| `/insights` | 18 | 8 | 10 | range filter, Export, Dismiss, Apply are inert |
| `/path` | 18 | 3 | 15 | the whole path builder is inert |
| `/learn` | 19 | 2 | 17 | the whole player is inert |

The editor's 2 are "Export CSV" and "Compare v2 → v3", and both are already
`disabled` with a `title` naming the week they land. That is the pattern this
codebase uses for anything not built yet: **a control that says what it is beats
a control that looks alive and does nothing.** The other four screens do not
follow it — their buttons are live-looking and silent.

This is the honest state of the product: **four surfaces are real, three are
still the prototype.** The three are inert for the same reason — they were
ported verbatim from `prototype/`, and the prototype had no behaviour behind
them. Anything demoed from Insights, Path or Learn is a screenshot, not a
feature, and should be described that way in the week 8 meeting.

`/studio` moved from the inert list to the real one, and the move is worth
recording because of *how* it was inert. The screen had 23 prototype controls
and a script in `components/PrototypeScripts.tsx` that simulated generation:
click `#genBtn`, fade the outline, light the log steps, print "Draft ready · 5
modules". Once the real action was wired, that script did not politely step
aside — it had attached its own click handler to the same button, so pressing
"Generate outline" ran the animation *instead of* the server action and then
overwrote the real status line with the canned text. The first end-to-end run
"passed" in 0.5 s with zero module rows. **A fake that wins the race against the
real thing is worse than no fake at all**, and the simulation block is now
deleted rather than disabled.

Six prototype controls on that screen were removed rather than wired: "Shuffle",
"+ Add module / Suggest", "Compare with last draft", "Send for review", "Fix
accessibility gap", and the invented finding "Captions missing for 2 narrated
slides". None of them had a behaviour to recover — two implied features we have
not built (version compare, module suggestion), and one was a fabricated
pedagogy result. The pedagogy panel is now computed from the outline (four
checks: objectives map to activities, module count under seven, retrieval
practice last, a hands-on activity in every module), so its score is a fact
rather than a typographic decoration.

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
