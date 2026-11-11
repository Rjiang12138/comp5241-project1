# Test report

Written in week 11 from `docs/test-plan.md`. Every number below is either a
count from a command that was run or a status observed in a browser; none of it
is recalled. Where a case was not run, the report says so rather than rounding
up.

Owner: R3 平台 (course editor + admin console + access rules). Target:
<https://comp5241-project1.vercel.app/>, `main` at `24423be`.

---

## 0. The two environments

Both were used, and — as §2 spells out — not for the same cases. They are not
the same program either:

| | Local | Online |
| --- | --- | --- |
| URL | `http://localhost:3000` | <https://comp5241-project1.vercel.app/> |
| Code | `main` at `24423be` plus `fix/course-ownership` (D-27/D-28) | `main` at `24423be` — **without** that branch |
| Database | own Neon project (`icy-unit-65121369`) | a **different** Neon project |
| Model line on `/studio` | `ChatAnywhere · gpt-4o-mini · spare OpenRouter` | `template-v1` |
| Generation path | real model call | `draftFromHeadings()` |
| Data can be reset | yes (`npm run db:reset`) | no |

The databases being separate is not a detail: it is why SM-01 and SM-03 read
different numbers on the two sides (§5.2). Neither set is wrong; they are two
seeds.

Local runs need `NEXT_DIST_DIR=.next-run npm run dev`. The sandbox file guard
refuses the 50-file delete that `next dev` performs when it clears `.next`, so
the build is pointed at a fresh directory instead. `.next-*/` is already in
`.gitignore`.

## 1. What was run

| Level | Tool | Count | Result | Where |
| --- | --- | --- | --- | --- |
| Static | `tsc --noEmit` | whole tree | pass | CI, every push |
| Build | `next build` | 14 routes | pass, all `ƒ` except `_not-found` | CI + local, 2026-11-11 |
| Unit | `node --test` | **62** | **62 pass, 0 fail** | local, `main` |
| Hand-written cases | browser walk + `curl` | **32 planned** | **32 run, 30 pass, 2 fail** | local (all 32) + production URL (AU, SM-01/02/03) |
| UAT | scripted, two rounds | **0 rounds** | **not run** | — |

The 62 unit tests are the six suites in `package.json`:

| Command | Cases | Covers |
| --- | --- | --- |
| `npm run test:studio-input` | 32 | deck/brief parsing, heading segmentation, PDF vision input |
| `npm run test:ai-audit` | 13 | attempt recording, provider attribution, token counts |
| `npm run test:studio-quality` | 6 | outline quality gates (module count, minutes, duplicates) |
| `npm run test:quiz` | 5 | a generated quiz's answer is not always the first option |
| `npm run test:analytics` | 4 | insight thresholds and the 7-day window |
| `npm run test:r4-demo` | 2 | the R4 demo fixture stays internally consistent |

```bash
npm run test:studio-input && npm run test:ai-audit && npm run test:studio-quality \
  && npm run test:quiz && npm run test:analytics && npm run test:r4-demo
```

## 2. Cases, per area

All 32 cases were walked by hand. **They were not all walked on the same
machine**, and the table says which is which, because the difference matters:

| Area | Planned | Run | Pass | Fail | Where |
| --- | --- | --- | --- | --- | --- |
| Course editor (CE-01…CE-12) | 12 | 12 | 11 | 1 | **local only** |
| Admin (AD-01…AD-06) | 6 | 6 | 5 | 1 | **local only** |
| Access and session (AU-01…AU-09) | 9 | 9 | 9 | 0 | both — 6 by `curl` on the URL, 3 in a browser |
| Deployment smoke (SM-01…SM-05) | 5 | 5 | 5 | 0 | SM-01/02/03 on both; SM-04 local; SM-05 from the build |
| **Total** | **32** | **32** | **30** | **2** | |

The editor and admin flows were driven against the **local server**, where the
database can be reset and the working tree holds the D-27/D-28 fix. They have
not been re-walked on the deployed URL, and the reason is not convenience: the
deployed build is still `24423be`, which **contains D-28**. Walking CE-01 on the
URL today would open a course that is not the signed-in instructor's, and the
run would spend its time re-finding a defect that is fixed in the working tree
and not yet deployed. The order has to be: deploy, then walk CE and AD again.

Until that happens, the honest claim is: **CE and AD pass locally; the deployed
URL has been checked on the access surface only.**

One case was added during the run and is not counted above: **SM-06** (a PDF
upload against Vercel's 4.5 MB request-body cap). It exists because the cap sits
in front of Next and nothing local can surface it. It was **not run** — see §6.

### 2.1 Course editor — measured locally

Signed in as `r.kwok@polyu.edu.hk`, opened a course from `/courses`.

| Case | Did | Expected | Observed |
| --- | --- | --- | --- |
| CE-01 | Renamed a module, clicked away, reloaded | Title persists | persisted after F5 ✓ |
| CE-02 | `+ Add module` | Appears last, numbering 01…0n, no gap | ✓ |
| CE-03 | `↓` on module 1, then `↑` | Original order restored | ✓ |
| CE-04 | `✕` on a middle module | Module and activities gone, later modules renumber | ✓ |
| CE-05 | `+ Add activity` with format `reading` | Row with `reading` and **8 min** | ✓ |
| CE-06 | Changed a row's format to `quiz`, reloaded | Pill and select agree | ✓ |
| CE-07 | Set Time to `0`, then `-5` | Rejected; previous value kept | **reset to 8** ✗ → D-25 |
| CE-08 | Summed activity Time, compared with the header total | They match | ✓ |
| CE-09 | `Publish v2` | Published, version +1, new row under Versions | ✓ |
| CE-10 | `Publish v3` | Two version rows, version +2, no duplicates | ✓ |
| CE-11 | Cleared the course title, saved | Falls back to **Untitled course** | ✓ |
| CE-12 | `/courses/does-not-exist` | 404 page | 404, no stack trace ✓ |

CE-07 is the only failure, and it is a small one: the value is not corrupted,
it is silently replaced by the default. A user who typed `0` by accident sees
`8` and has no idea why.

While walking CE-06 an apparent second defect was chased — "changing the format
loses the minutes" — and then disproved: the number had already been reset by
the `0` test in CE-07 before the format was changed. It was not filed. It is
recorded here because a run that files only the defects it kept is not a log,
it is a highlight reel.

### 2.2 Admin console — measured locally

Signed in as `a.tse@polyu.edu.hk`.

| Case | Did | Expected | Observed |
| --- | --- | --- | --- |
| AD-01 | Created a cohort with a code and an instructor | Row appears with that instructor | ✓ |
| AD-02 | Created a cohort with an empty code | Nothing happens, no empty row | ✓ |
| AD-03 | Reassigned a cohort's instructor | Cohort **and its courses** show the new owner | cohort changed, courses did not ✗ → D-27 |
| AD-04 | Compared the cohort row's learner count with the enrolments | Equal | equal ✓ |
| AD-05 | As instructor, opened `/admin` | 307 → `/login`, no data rendered | `307 → /login?next=%2Fadmin&need=admin` ✓ |
| AD-06 | As admin, opened `/admin` | Console renders with cohort rows | ✓ |

AD-03 is the one that mattered. It is also the one the screen promises in
words: `/admin` says reassigning "re-points the cohort and every course attached
to it", and the second half of that sentence was not implemented. Fixed in this
commit; see §3.

### 2.3 Access and session — measured

Two halves: the `curl` half was run against the deployed URL with no browser,
the browser half was walked on both environments.

| Case | Request / did | Expected | Observed |
| --- | --- | --- | --- |
| AU-01 | no cookie → `/courses` | 307 → `/login` | `307 → /login?next=%2Fcourses` ✓ (see §5.1) |
| AU-02 | admin → `/courses` | Sidebar shows Admin, name updates | ✓ |
| AU-03 | Sign out | Cookie cleared, `/login` renders | ✓ |
| AU-04 | learner → `/courses`, `/studio`, `/insights` | 307, not 200 | `307 → /login?next=…&need=staff` ✓ (see §5.1) |
| AU-05 | learner → `/learn`, `/path`, `/settings` | 200 | `200`, `200`, `200` ✓ |
| AU-06 | learner sidebar | My learning · My path · Settings only | ✓ — checked on `/settings`, see below |
| AU-07 | learner → `/insights/export`, `/courses/c-sef/export` | 403 | `403`, `403` ✓ |
| AU-08 | instructor → `/admin` | 307 → `/login` | `307 → /login?next=%2Fadmin&need=admin` ✓ |
| AU-09 | learner POSTs an editor action | `requireStaff()` throws before the write | ✓ |

AU-06 was first looked for on `/learn` and not found, because `/learn` and
`/path` render through the player layout and have no sidebar at all. The sidebar
only exists on `/settings`. That is not a defect — it is a fact about the app
that the test plan did not know when it wrote "learner sidebar".

### 2.4 Deployment smoke — measured

| Case | Request / did | Expected | Observed |
| --- | --- | --- | --- |
| SM-01 | `/` | Renders, no console error | `200`, no error, both sides ✓ |
| SM-02 | `/` `/login` `/learn` `/courses` `/studio` `/insights` `/path` `/settings` `/admin` | 200, no blank page | anonymous: `/` and `/login` `200`, the other seven `307 → /login`; as admin `/admin` and `/courses` `200` ✓ — re-measured on the URL 2026-11-11 |
| SM-03 | `/courses` | Six courses, owner names, version pills | **7 local, 8 online** ✓ — the seventh local is the course generated during the D-15 test (see §5.2) |
| SM-04 | Renamed a module, reloaded | Survives the reload | ✓ locally, same walk as CE-01; not repeated online |
| SM-05 | First-load JS per route | under 250 kB | 103–113 kB ✓ (from the build, not the URL) |

SM-04 and SM-05 were verified locally rather than on the URL — SM-04 because
CE-01 already performs the identical walk and passed, SM-05 because bundle size
is a build artefact that the deployed site does not expose. Both are marked pass
with that caveat rather than being quietly counted twice.

### 2.5 The generation path — measured locally only

This is the part the online site cannot test, because Vercel has no LLM key yet
(Rjiang's plan is to add one closer to the demo). Local `/studio` reports
`Model: ChatAnywhere · gpt-4o-mini · spare OpenRouter`.

| Was | Case | Result |
| --- | --- | --- |
| D-15 | "Generate outline" on a real deck | returned in **4.4 s**; audit row `chatanywhere · gpt-4o-mini · 4 modules · 45 min projected`. `P2028` did not recur. |
| D-21 | Activity bodies in a generated course | non-empty, and no quiz asks "Which statement about *<module title>* is defensible?" — but the bodies are heading-derived (`draftFromHeadings()`), not model-written prose |

D-21 gets a qualified pass: the symptom is gone, the quality claim is not made.
A template that reads correctly is still a template, and §6 says so.

Online, `/studio` reports `template-v1` and every activity goes through
`fallback()`. The deployed site is on the degraded path by design until a key
exists, and this report does not pretend otherwise.

## 3. Defects

**29 found, 25 fixed, 4 open.** D-01…D-23 are logged in `docs/test-plan.md` §6
with the reasoning for each fix in §8.1–§8.15 of the same file. D-24…D-29 were
found by this run and are below.

| Severity | Found | Fixed | Open |
| --- | --- | --- | --- |
| blocker | 9 | 9 | 0 |
| major | 16 | 14 | 2 |
| minor | 4 | 2 | 2 |

Three of the earlier ones are worth naming because they would have embarrassed
a live demo:

- **D-15** — "Generate outline" answered 500 with `P2028`: the transaction
  exceeded its 5 s budget. Fixed by one nested write instead of seventeen
  sequential inserts.
- **D-21** — every activity in a *generated* course was rendered by `fallback()`,
  so a quiz asked "Which statement about *<module title>* is defensible?" with
  three obviously wrong options.
- **D-22** — five of the six courses were real, complete, and unreachable,
  because `/learn` always opened the first enrolment.

### 3.1 Found by this run

| ID | What | Severity | Status |
| --- | --- | --- | --- |
| D-24 | The editor offers `Mini-game` and `Narrated slides`; the player cannot render either | major | **open** |
| D-25 | A non-positive minutes value is replaced by the default 8 instead of keeping the previous value | minor | **open** |
| D-26 | Minutes have no upper bound — `9999` was accepted, producing a 10 029-minute course | minor | **open** |
| D-27 | `assignInstructor()` moved the cohort and left every course with the old owner | major | **fixed** |
| D-28 | Any instructor could open, edit and publish any other instructor's course | major | **fixed** |
| D-29 | `Open learner view` on a draft course shows the learner shelf, not a preview | major | **open** |

**D-24.** `lib/activity-content.ts:811` defines `UNBUILT_FORMATS = ["game",
"narrated_slides"]` and nothing in the repository references it. `fallback()`
has no `case` for either format, so it lands on `default` and returns a reading
article — while the activity pill still says `Mini-game`. `/learn`'s own copy
admits it: *"Mini-games and narrated slides are modelled but not built."* Not
fixed, and deliberately: mini-games are R4's deliverable, so removing the enum
values would delete a teammate's work. The defect is that the editor offers a
format the player cannot honour, and the honest fix is R4's, not a `select`
option removal by R3.

**D-25 / D-26.** Both live in one function. `app/courses/actions.ts:36`:

```ts
function num(formData: FormData, key: string, fallback: number): number {
  const parsed = Number(formData.get(key));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}
```

`updateActivityAction` passes `fallback = 8`, so `0`, `-5` and an empty box all
become `8` rather than "keep what was there" — which is what CE-07 expects. The
same expression has no ceiling, so `9999` is accepted. Left open: the fix is a
validation message, and a validation message is a UI decision that this report
is not the place to make at week 11.

**D-27.** `assignInstructor()` updated `cohort.instructorId` and stopped there,
so `/admin` said Chan while `/courses` still said Kwok for every course in that
cohort — the exact half-state the page's own copy says it avoids. Fixed by
making it one transaction:

```ts
await prisma.$transaction([
  prisma.cohort.update({ where: { id: cohortId }, data: { instructorId } }),
  prisma.course.updateMany({ where: { cohortId }, data: { ownerId: instructorId } }),
]);
```

**D-28.** The worse one. `listCourses()` had no `where` clause, so every
instructor saw every course, and `app/courses/[id]/page.tsx` only asked
`requireStaff()` — "are you staff", not "is this yours". Any instructor could
open another's course, rename its modules, and publish it, and the owner would
never know. Found by signing in as a second instructor and clicking a card that
should not have been clickable. Fixed in two places: the listing marks
non-owned cards `Read only` and does not link them, and the editor redirects a
non-owner to `/courses?denied=owner`. Admins keep full reach — reassigning
courses is their job. Verified without touching the database, on a local seed of
seven courses where Chan owns four:

```
                                       local (fixed)   URL (24423be)
Chan  → /courses    "Open editor"          8              16
                    "Read only"            6               0
Chan  → /courses/c-prod               307 → ?denied=owner  200
Chan  → /courses/c-req                307 → ?denied=owner  200
Chan  → /courses/c-test               307 → ?denied=owner  200
admin → /courses/c-prod                    200             200
npx tsc --noEmit                        exit 0              —
```

Every count is doubled in the HTML (the class and its label), so `8` is four
cards and `16` is eight. The two rows that matter are `Read only`: six locally,
zero on the URL — the URL gives every instructor the same list the admin gets.

**D-29.** `Open learner view` is a real button that does not do what it says for
a draft course: `getLearnerView()` recognises enrolments only, and the `preview`
flag the editor sets is never passed through, so a draft opens the learner shelf
instead of the draft. Confusing rather than dangerous — no data leaks, the wrong
page appears. Open.

### How "fixed" is being used

`docs/test-plan.md` §6 sets the bar: *"A defect is only 'fixed' when the case
that found it passes on the preview URL, not when the code is merged."*

By that bar, **neither D-27 nor D-28 is fully fixed yet**, and the two are in
different states:

- **D-28** is verified by request, not by a browser walk: a non-owner gets
  `307 → /courses?denied=owner` on the three courses Chan does not own, the admin
  gets `200` on the same three, and the listing marks them `Read only` instead of
  linking them. That is the whole claim the fix makes, and it holds on the local
  server.
- **D-27** is fixed in code and **not verified at all**. AD-03 writes to the
  database — reassigning a cohort moves its courses — and the run was
  deliberately done against a database that would not be mutated further. The
  browser re-walk is outstanding.

Everything else in D-01…D-23 that has a browser case behind it was re-walked
during this run — **locally**. The previous draft of this report admitted that
the editor and admin cases behind D-08…D-12 had not been re-walked at all since
the merge; they have now, on the local server. The deployed URL still has not
seen them.

D-28 is why that distinction is not pedantry: it is fixed in the working tree and
**live on the URL at the same time**. Same request, same cookie, two answers:

```
praxis_uid=u-chan  GET /courses/c-prod
  https://comp5241-project1.vercel.app  →  200   the editor, fully usable
  http://localhost:3000                 →  307   /courses?denied=owner
```

A report that said "fixed" without naming the environment would be true of one
machine and false of the other.

## 4. UAT

**Not run.** `docs/test-plan.md` §5 plans two rounds — three classmates in week
10, two fresh users in week 11 — with a scripted five-step editing task.

Neither round happened. The consequence is specific: the plan's exit criterion
("every participant completes steps 1–5 unaided") has no data behind it, and the
three changes that UAT was supposed to surface do not exist. Nothing in this
report should be read as a usability claim.

What stands in for it is thinner and is described as such: the flows were walked
by the person who built them, which finds broken links and not confusing ones.
D-28 is the counter-example that keeps this section honest — a second pair of
eyes found in ten minutes what the author's own walk had missed for a week.

## 5. What the run found that was not on the list

### 5.1 Two cases whose expected result had quietly gone stale

AU-01 expects a request with no cookie to "render as the demo instructor".
AU-04 expects a learner who opens `/courses` to be sent to `/learn`, on the
reasoning that they *are* signed in and the page simply is not theirs.

Neither is what the build does. Both now answer `307 → /login?next=…`, and
AU-04 adds `&need=staff`. This is not a regression: `git log -S "need" --
lib/auth.ts` points at `fc87846`, which added the parameter deliberately so that
a learner following a link to a staff page lands on the picker with "this page
needs an instructor" rather than being silently dropped somewhere else. D-19
added `requireUser()` for the same reason.

The behaviour is better than the plan. The plan was written before it and was
never updated. Found because the cases were finally run against a URL instead of
being read — a status column that says `pass` is a claim about a build, not
about the current one.

### 5.2 "The database" is two databases

SM-01 read **58% average progress** locally and **59%** online. SM-03 counted
**7 courses** locally and **8** online.

The first instinct was to treat one side as dirty. Neither is: the local Neon
project is `icy-unit-65121369`, the deployed one is a different project, and the
two are seeded independently. The six fixture ids (`c-agent` … `c-test`) exist on
both sides because both were seeded from the same fixture, but the rows behind
them are not the same rows — the extra local course is one generated during the
D-15 test, and the extra two online are drafts left by earlier testing. That is
why they appear in `/courses` for staff and not in `/learn` for a learner.

Two consequences, both of which changed how the run was done:

- A defect that depends on data (a count, a percentage, an owner name) has to be
  judged on shape, not on the number. SM-03 passes at 7 and at 8.
- "It works on my machine" is not available as an excuse anywhere in this
  project, because the deployed site is running different data against the same
  commit. That is a better test than a copy would have been — and it is also why
  a fix can be green locally and wrong on the URL, which is exactly what §3 says
  happened to D-28.

### 5.3 The build proves there is no static rendering

CI builds with `DATABASE_URL=postgresql://ci:ci@localhost:5432/ci` — a host that
does not exist. It passes. That is only possible because every route is
`ƒ (Dynamic)`; a single statically prerendered page that touched the database
would fail the build.

This was written down as a risk in week 9 ("the build fails without the database
variables, because `next build` evaluates every page") and turned out to be false
for the current route table. `DEPLOYMENT.md` §5 still carried the wrong version
of that sentence until it was corrected against the build output.

### 5.4 The most useful defect was found by clicking something that looked fine

D-28 was not found by a test case. It was found by signing in as a second
instructor, looking at `/courses`, and noticing that the cards were *all there*
— which is what the screen is supposed to do, and is exactly why it went
unexamined for a week.

Every case in §2 passed on the day that defect shipped. A test suite built from
the requirements would not have caught it, because the requirement did not say
"a course belongs to its owner" — the screen did, in a sentence nobody had
implemented.

## 6. What is not tested, and why

| Not tested | Why | Where it is covered instead |
| --- | --- | --- |
| **CE-01…CE-12 and AD-01…AD-06 on the deployed URL** | the URL is still `24423be`, which contains D-28; walking the editor there means walking into a known, already-fixed defect | local run, §2.1 and §2.2 — **re-run on the URL after the next deploy** |
| **SM-06** — a 4–8 MB PDF upload against Vercel's 4.5 MB body cap | not run; needs a large file and a deployed staff session | nothing yet — this is the first item to run before the demo |
| Quality of generated course content | assertions cannot judge a good module sequence | prompt review, `docs/ai-usage-log.md`, `docs/studio-quality.md` |
| The code lab's checks | `mustInclude` is a substring assertion, not a test run | named as a limitation in `DEPLOYMENT.md` §9 |
| Analytics arithmetic against real cohorts | the numbers are queries over `events`; there is one seeded cohort | `docs/analytics-insights.md`, `test:analytics` |
| Concurrent generation on serverless | the throttle is per process; reproducing it needs two instances | described in `DEPLOYMENT.md` §5 |
| Real authentication | the session is a demo switcher by design | `DEPLOYMENT.md` §9 |
| The online generation path with a real model | Vercel has no LLM key yet | local run, §2.5 |

## 7. How to reproduce

```bash
# unit
npm run test:studio-input && npm run test:ai-audit && npm run test:studio-quality
npm run test:quiz && npm run test:analytics && npm run test:r4-demo

# build, exactly as CI runs it
env -u NODE_OPTIONS npm run build

# local server (NEXT_DIST_DIR avoids the sandbox bulk-delete guard)
NEXT_DIST_DIR=.next-run npm run dev

# access surface, against the deployed URL
B=https://comp5241-project1.vercel.app
curl -s -o /dev/null -w "%{http_code}\n" -b "praxis_uid=u-mei"  "$B/courses"          # 307
curl -s -o /dev/null -w "%{http_code}\n" -b "praxis_uid=u-mei"  "$B/learn"            # 200
curl -s -o /dev/null -w "%{http_code}\n" -b "praxis_uid=u-mei"  "$B/insights/export"  # 403
curl -s -o /dev/null -w "%{http_code}\n" -b "praxis_uid=u-kwok" "$B/admin"            # 307
curl -s -o /dev/null -w "%{http_code}\n" -b "praxis_uid=u-tse"  "$B/admin"            # 200

# D-28, the ownership check (Chan must not reach a course Chan does not own)
# 307 only once the fix is deployed; on 24423be both lines answer 200
curl -s -o /dev/null -w "%{http_code}\n" -b "praxis_uid=u-chan" "$B/courses/c-prod"   # 307
curl -s -o /dev/null -w "%{http_code}\n" -b "praxis_uid=u-tse"  "$B/courses/c-prod"   # 200
```

The click-through version of §2, written to be followed without the plan open,
is `docs/manual-test-checklist.md`.

## 8. Summary for the final report

- **62 automated unit tests, all passing**; `tsc` and `next build` green in CI.
- **29 defects found, 25 fixed, 4 open**; two of the six new ones (D-27, D-28)
  were in the code this role owns, and one of them was a permission hole.
- **32 planned cases: 32 run, 30 pass, 2 fail.** The two failures are CE-07
  (D-25, open) and AD-03 (D-27, fixed but not re-walked in a browser).
- **Both environments were tested, but not on the same cases.** The access
  surface and the smoke cases were checked on the deployed URL; the editor and
  admin flows were walked locally only. The two are genuinely different —
  separate databases, different generation paths — so neither result can be
  inferred from the other, in either direction.
- **The deployed URL is one commit behind the working tree.** D-28 is fixed in
  the code and still live on the URL: `GET /courses/c-prod` as Chan answers `200`
  on `comp5241-project1.vercel.app` and `307 → /courses?denied=owner` on
  `localhost:3000`, measured today. Deploy, then re-walk CE and AD on the URL.
- **UAT not run** — no usability claim is made.
- The deployment is live and the access rules are enforced on the server, which
  is the one claim in `docs/requirements.md` that a marker can check in a browser
  in ten seconds. The narrower claim — that a course belongs to its owner — is
  true of the working tree and not yet of the URL.
