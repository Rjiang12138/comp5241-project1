# Manual test checklist — online (Vercel) run

Run against <https://comp5241-project1.vercel.app/>. Companion to `docs/test-plan.md` §3.
Every row here is a case from the plan, rewritten as something you can click through
without holding the plan in your head.

---

## 0. Before you start

### 0.0 The two environments

This run tests **both**, because they exercise different code paths.

| | Local | Online |
| --- | --- | --- |
| URL | `http://localhost:3000` | `https://comp5241-project1.vercel.app/` |
| Start it with | `NEXT_DIST_DIR=.next-run npm run dev` | already running |
| Model line on `/studio` | `ChatAnywhere · gpt-4o-mini · spare OpenRouter` | `template-v1` |
| Path under test | **main path** — real model call | **degraded path** — `draftFromHeadings()` |
| Database | your own Neon project (`icy-unit-65121369`) | Rjiang's Neon project |
| Data you can undo | yes (`npm run db:reset`) | no |

`NEXT_DIST_DIR` is required locally: the sandbox file guard refuses the 50+ file
delete that `next dev` performs when it clears `.next`, so the build is pointed at a
fresh directory instead. `.next-*/` is already in `.gitignore`.

Two side effects of a local run, both harmless, both worth undoing afterwards:

- `next dev` rewrites `tsconfig.json` (reformats it and adds `.next-run/types/**/*.ts`
  to `include`). Restore it with `git checkout -- tsconfig.json` when you are done.
- `prisma db push` had to run once because the local database was behind the schema —
  `AiRun.provider` did not exist, and `/studio` returned 500 until it was added.

### 0.1 Confirm which generation path you are on

Open `/studio` as staff. The model line at the top of the page tells you:

| What it says | Meaning | What this run covers |
| --- | --- | --- |
| `Model: template-v1` | No LLM key in Vercel. Generation uses `draftFromHeadings()`. | The **degraded path** — the only shape the site has until a key is added. |
| `Model: OpenRouter · free-tier chain` | A key was added after this checklist was written. | The **main path**. Re-run CE/AD, they behave the same, but `/studio` output differs. |

Record which one you saw. It goes in the report as the environment line.

### 0.2 Identities

Sign-in is passwordless: go to `/login`, type the email, submit. The cookie is `praxis_uid`.

| Role | Email | Name you should see |
| --- | --- | --- |
| admin | `a.tse@polyu.edu.hk` | A. Tse |
| instructor | `r.kwok@polyu.edu.hk` | Dr. R. Kwok |
| instructor | `m.chan@polyu.edu.hk` | Dr. M. Chan |
| learner | `mei.wong@connect.polyu.hk` | Mei Wong (non-CS) |
| learner | `arjun.lee@connect.polyu.hk` | Arjun Lee (CS) |

To switch identity: sign out first (sidebar → Sign out), then sign in as the next one.
Reusing a tab without signing out keeps the old cookie.

### 0.3 What this run cannot cover

| Case | Why not | Where it is covered instead |
| --- | --- | --- |
| D-15 — generation transaction timeout | Needs a real model call; the template path returns in 0.0 s | Local `npm run dev` with keys |
| D-21 — generated activity body text | Same reason: `template-v1` never reaches the model | Local `npm run dev` with keys |
| SM-05 — bundle size | Needs `next build` output, not the deployed site | Local build log |

### 0.4 Running both at once

One browser, two windows: a normal window for the online site, an incognito window for
localhost. Cookies are per-origin, so the two never interfere — but within one origin
only one identity can be signed in at a time.

Work **by identity**, not by environment, so each sign-in covers both sides:

| Round | Sign in as | Online window | Local window |
| --- | --- | --- | --- |
| 1 | learner — `mei.wong@connect.polyu.hk` | AU-04, AU-06, SM-01, SM-02 | same cases |
| 2 | instructor — `r.kwok@polyu.edu.hk` | SM-03, SM-04, CE-01…CE-12 | same cases |
| 3 | admin — `a.tse@polyu.edu.hk` | AD-01…AD-06, CE-12 | same cases |

Sign out between rounds on both sides. A round is not finished until both columns have a
mark in them.

### 0.5 One case that only exists online

`next.config.ts` sets `bodySizeLimit: "16mb"` for server actions, and its own comment
says the COMP5241 lecture decks run 3–8 MB. **Vercel caps a serverless request body at
4.5 MB**, and that cap sits in front of Next — so a 5 MB PDF may be rejected online while
the identical upload succeeds locally.

Test it once, online, signed in as staff:

1. Open `/studio`
2. Upload a PDF between 4 and 8 MB (the COMP5241 decks are in the parent folder)
3. Note what comes back: a readable error, a silent failure, or `413`

Record the outcome under SM-06 in the report. This is the single strongest argument for
having tested online at all — nothing local can surface it.

---

## 1. Deployment smoke (SM) — 5 cases

| ID | Do this | Expect | Record |
| --- | --- | --- | --- |
| SM-01 | Open `/` in a fresh tab. Watch the browser console (F12). | Landing renders; console has no error | ☐ |
| SM-02 | Visit `/`, `/login`, `/learn`, `/courses`, `/studio`, `/insights`, `/path`, `/settings`, `/admin` while signed in as admin | No blank page. Learner-only pages 200; the rest 200 as admin | ☐ |
| SM-03 | As instructor, open `/courses` | Course cards with owner names and version pills. **Expect 6 on a clean database — the online database has extra drafts from earlier testing, so 8–10 is also a pass.** Note the actual count. | ☐ count: ___ |
| SM-04 | Open any course, rename a module, press Tab, reload the page | The new title survives the reload | ☐ |
| SM-05 | Not runnable here | See §0.3 | n/a |

---

## 2. Access and session (AU) — browser re-check of 3

Nine AU cases exist; six were already verified by `curl` and are marked `pass` in the
plan. These three need a browser because they are about what the page *shows*.

| ID | As | Do this | Expect | Record |
| --- | --- | --- | --- | --- |
| AU-02 | admin | Sign in as `a.tse@polyu.edu.hk`, open `/courses` | Sidebar shows **Admin**; the name in the sidebar updates to A. Tse | ☐ |
| AU-06 | learner | Sign in as `mei.wong@connect.polyu.hk`, look at the sidebar | **My learning · My path · Settings** only — no Studio, no Cohorts, no Insights | ☐ |
| AU-04 | learner | While signed in as Mei, type `/courses` in the address bar | Redirected to `/login?next=%2Fcourses&need=staff`. **The plan says `/learn`; that expectation is stale** (`fc87846` added the `need=staff` gate). Record what actually happened, not what the plan predicted. | ☐ actual: ___ |

---

## 3. Course editor (CE) — 12 cases

All of these need **staff** rights. Use `r.kwok@polyu.edu.hk`. Open any course from
`/courses`, then work on the editor page. None of them depend on the model.

Controls on the page, for reference:

- per module: `↑` (Move module up) · `↓` (Move module down) · `✕` (Delete module)
- per activity row: title inline input · Format select · Time number input · `✕` (Delete activity)
- bottom of each module: `New activity title` input + format select + `+ Add activity`
- bottom of the module list: title input + `+ Add module`
- header: `Open learner view` · `Publish v{n+1}` · `Export CSV` · `Manage cohort`

| ID | Do this | Expect | Record |
| --- | --- | --- | --- |
| CE-01 | Click a module title, type a new name, click somewhere else, then reload | New title persists | ☐ |
| CE-02 | Type a title in `+ Add module`, submit | New module appears **last**; numbering stays 01…0n with no gap | ☐ |
| CE-03 | Click `↓` on module 1, then `↑` on it again | Order returns to the original | ☐ |
| CE-04 | Click `✕` on a middle module | Module and its activities disappear; later modules renumber with no gap | ☐ |
| CE-05 | Type a title in `New activity title`, leave format as `reading`, submit `+ Add activity` | Row appears with format `reading` and **8 min** | ☐ |
| CE-06 | Change one row's Format select to `quiz`, reload | The pill and the select still agree | ☐ |
| CE-07 | Set an activity's Time to `0`, then to `-5` | Rejected; the previous value is kept | ☐ |
| CE-08 | Add up every activity's Time, compare with the course header total | They match | ☐ |
| CE-09 | Click `Publish v{n+1}` | Status becomes Published; version increments by 1; a new row appears under Versions | ☐ |
| CE-10 | Click Publish a second time | Two version rows, version +2 total, no duplicate rows for the same version | ☐ |
| CE-11 | Clear the course title and save | Falls back to **Untitled course**; never a blank heading | ☐ |
| CE-12 | Visit `/courses/does-not-exist` | 404 page, not a crash or a stack trace | ☐ |

---

## 4. Admin console (AD) — 6 cases

Sign in as `a.tse@polyu.edu.hk`, open `/admin`.

| ID | Do this | Expect | Record |
| --- | --- | --- | --- |
| AD-01 | Create a cohort: fill code + pick an instructor, submit | Row appears with the chosen instructor | ☐ |
| AD-02 | Create a cohort with an empty code | Form does nothing; no empty row is created | ☐ |
| AD-03 | Reassign an existing cohort's instructor | The cohort row **and its courses** show the new owner | ☐ |
| AD-04 | Compare the learner count on a cohort row with the enrolments for that cohort | They are equal | ☐ |
| AD-05 | Sign out, sign in as `r.kwok@polyu.edu.hk`, open `/admin` | 307 → `/login`; no admin data rendered at any point | ☐ |
| AD-06 | Sign back in as admin, open `/admin` | Console renders with cohort rows | ☐ |

---

## 5. Filling the report

After the run, `docs/test-report.md` §2 needs two numbers per case group: how many were
run, and how many passed. The plan's status column can then move from `—` to `P` / `F`.

Anything that fails gets a row in §3 with: the case ID, what you clicked, what you saw,
what the plan expected. Do not fix it during the run — record first, fix after, or the
run stops being a test and becomes a debugging session.
