# Handover — read this before you build on the branch

**Short version.** `feat/platform-postgres` now holds a working end-to-end
prototype. It was built by the owner of the platform task, outside the split we
agreed in week 9, as a floor to stand on rather than a replacement for anyone's
part. Two starting points are tagged so the team can choose; see §2.

Last commit: see `git log -1`. Everything below was verified on 2026-10-31.

---

## 1. What this actually is

The agreed split gave R3 the platform: shell, routing, auth, database, deployment.
R1/R2/R4/R5 each owned screens. What landed on this branch is bigger than that —
the platform plus every screen, wired to Postgres, with the model pipeline
connected. It was built because the screens could not be reviewed honestly while
they were still rendered from the mid-term prototype's HTML, and because "does
the platform work" is not answerable without something running on top of it.

So treat this branch as **a reference implementation, not a decision**. If your
part is already further along in your head, keep yours and take only the pieces
you need; §2 shows how to take one file. If your part has not started, this is a
working baseline that already does the boring half.

It is deliberately small: six courses, twenty-two hand-written activities, one
generator, no mini-games. It is not the final product and it does not try to be.

## 2. Two starting points — pick one

| Start from | Command | What you get |
| --- | --- | --- |
| **The week 9 skeleton** | `git checkout v0.0-skeleton` | Exactly what was on this branch before the platform work: shell, routing, session guard, schema, CI, docs. Screens still rendered from `prototype/*.html`. Nothing wired to a model. |
| **This branch's tip** | `git checkout feat/platform-postgres` | The working prototype: every screen real, six published courses, generation wired, learner runtime writing events. |

To see the distance between them:

```bash
git diff v0.0-skeleton..feat/platform-postgres --stat
```

To take **one part** of it without taking all of it — for example the model seam
and the activity author, but not the learner runtime:

```bash
git checkout feat/platform-postgres -- lib/llm.ts lib/author.ts lib/generate.ts
```

That is a legitimate way to use this branch. Nothing in it depends on the screens
being the ones that shipped here, except `components/Shell.tsx` (every page
imports it) and the `contentFor()` priority order described in `AGENTS.md`.

If the team would rather not carry any of it, `v0.0-skeleton` is a complete,
building, CI-passing starting point on its own. Nothing is lost by ignoring this
branch — but the two defects the platform work fixed (the role guard letting a
deep link in as a demo user, and `/learn` opening the same course every time) are
written up in `docs/test-plan.md` §8.9 and §8.12 if you hit them again.

## 3. What you must set up yourself

**Nothing secret is in this repository, and nothing secret ever will be.**
`.env.local` is gitignored; `.env.example` lists the names. Every person needs
their own copy.

### 3.1 Database (required — the app does not start without it)

```bash
# either join the existing Neon project and ask for the two strings, or make your own:
neon init -y --services postgres
neon login
neon deploy            # writes DATABASE_URL and DATABASE_URL_UNPOOLED
```

If you are making your own Neon branch, note that **`db:seed` truncates**. Run it
once on a branch you own, never against the shared one — it wipes the rows
everyone else is looking at.

```bash
npm install
npm run db:push        # create the tables from prisma/schema.prisma
npm run db:seed        # load the fixture: 24 learners, 6 courses, the event log
npm run dev
```

`db:push` and `db:seed` read `.env.local` through `dotenv-cli`; the Next.js
runtime reads it natively. Without `DATABASE_URL` the app starts but every page
that queries fails loudly — there is no silent fallback to fixture data.

### 3.2 Model keys (optional — the app works without them)

Generation has two providers in a fixed order: **ChatAnywhere first, OpenRouter
as the spare**. Both are free tiers.

| Variable | Needed for |
| --- | --- |
| `CHATANYWHERE_API_KEY` | the primary provider |
| `OPENROUTER_API_KEY` | the spare; used only when the primary declines |

With neither set, `/studio` still generates a course from the built-in template
and the screen says `Model: template-v1`. That is a supported state, not an
error. **Do not commit a key and do not paste one into an issue or a chat
transcript** — ask the platform owner to add it to the Vercel environment
instead, or get your own free key.

Free keys are rate-limited per key, not per person, so `lib/llm.ts` serialises
calls and spaces them by `LLM_MIN_GAP_MS` (default 4 s). If you see a 429 in the
generation log, raise that number before changing anything else.

### 3.3 Deployment

`DEPLOYMENT.md` is the full runbook. The one thing worth knowing before you
deploy: generation takes ~14 s and Vercel's default function limit is 10 s, so
`maxDuration = 60` is declared on `/studio` and `/path`. If the deploy times out
mid-generation, that is the first place to look.

## 4. What works, and what is honest about not working

| | State |
| --- | --- |
| Generate a course from a deck or a one-sentence brief | works, one model call + `lib/author.ts` writes the bodies |
| Six published courses a learner can join and play | works; progress is read from `events` |
| Tutor, staged hints, code-lab checks | works; the checks are substring assertions, not a test run |
| Path builder, insights, admin, roster import, CSV export, version diff | works, all queries over the event log |
| Mini-games, narrated slides, language switching | **not built**, and every screen that mentions them says so |

## 5. Sharp edges

1. **The session is a demo switcher, not authentication.** `praxis_uid` in a
   cookie makes you whoever you name, including the admin. Fine for a marked
   demo; do not put real student data behind it.
2. **One database, no per-environment split.** Preview and production read the
   same Neon branch, and the admin reset button on `/settings` truncates it.
3. **The model queue is per process.** On serverless, two concurrent visitors are
   two instances and the in-memory queue cannot see the other one. The 429
   handler makes a collision slow rather than broken. The real fix is a
   `pg_advisory_lock` on the database that is already there.
4. **No automated end-to-end suite.** `docs/test-plan.md` specifies it; the
   manual smoke run at the end of §8 in that document is what stands in for it.

## 6. Where to read more

- `AGENTS.md` — conventions and invariants, written for whoever (or whatever)
  edits this next. Short, and the rules in it are load-bearing.
- `DEPLOYMENT.md` — local setup, environment, Vercel, rollback, troubleshooting.
- `docs/test-plan.md` §8 — twenty-three defects with before/after tables. This is
  the most useful file in the repo for understanding *why* the code looks the
  way it does.
- `docs/wiring-a-screen.md` — how to add behaviour to a screen without inventing
  a fifth architecture.
