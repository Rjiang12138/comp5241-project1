# Deployment

Everything a new teammate — or a marker who wants to check our claims — needs to
get Praxis running locally and on a public URL. It gets a version bump whenever
the deployment changes.

**Live at <https://comp5241-project1.vercel.app/>** — built from `main` at
`24423be`, first deployed 2026-11-10.

Last verified: 2026-11-11, against the URL above, from a browser and from
`curl`, signed in as the admin, both instructors and a learner.

---

## 1. What runs, and what is still mock

Nothing on a screen is mock any more. Every page reads and writes Postgres
through `lib/store.ts`; there is no fixture markup left, and the components that
were generated from `prototype/*.html` have been deleted.

| Area | State |
| --- | --- |
| App shell, routing, design system | real — one shell, `components/Shell.tsx` |
| Landing page | real — reads the busiest course and `courseAnalytics()` |
| Studio (deck or brief → outline → activities with bodies) | real — one model call, then `lib/author.ts` |
| Course editor (modules, activities, ordering, publishing, versions) | real — writes to Postgres |
| Learner runtime (six published courses, six activity formats, tutor, hints, checks) | real — every click appends to `events` |
| Path builder, insights, admin, settings | real — queries and writes, no counters |
| Session and role guard | real, demo provider (a `praxis_uid` cookie; see §5) |
| Database | **Postgres on Neon**, wired through Prisma |
| LLM calls | **wired** — DeepSeek first, ChatAnywhere second, OpenRouter as the spare (`lib/llm.ts`) |
| Mini-games, narrated slides, language switching | **not built**. `/learn` says so in words, and the player has no renderer for either format — but the course editor still offers both in its format select, so an instructor can pick one and the learner silently gets a reading article. Logged as D-24 in `docs/test-plan.md` §6 |

Data lives in a Neon Postgres branch (`production`). `lib/store.ts` is the only
module that talks to it; everything else speaks its signatures.

## 2. Prerequisites

- Node.js **22 or newer** (`node -v`; `package.json` declares `engines.node >= 22`)
- npm 10+
- A Neon project with a `production` branch, and its connection string

## 3. Run it locally

```bash
git clone https://github.com/Rjiang12138/comp5241-project1.git
cd comp5241-project1
npm install                      # also runs prisma generate

# one-time: create .env.local with DATABASE_URL and DATABASE_URL_UNPOOLED
#   easiest: neon init -y --services postgres && neon login && neon deploy
#   manual:  copy .env.example and paste both strings from the Neon console
npm run db:push                  # create the tables
npm run db:seed                  # load the prototype fixture data
npm run dev                      # http://localhost:3000
```

`db:push` and `db:seed` read `.env.local` through `dotenv-cli`; the Next.js
runtime reads it natively. Without `DATABASE_URL` the app starts but every page
that queries will fail — there is no silent fallback to fixture data.

Open <http://localhost:3000>. Every route except `/` asks who you are first, so
you land on `/login` and pick an identity: **A. Tse** is the admin, **Dr. R.
Kwok** and **Dr. M. Chan** are instructors, and three learners are listed under
them. The choice is a cookie, not a password — see §5.

Useful commands:

| Command | Does |
| --- | --- |
| `npm run dev` | dev server with hot reload |
| `npm run build` | `prisma generate` then a production build (this is what CI runs) |
| `npm run typecheck` | `tsc --noEmit`, no emit, no side effects |
| `npm run db:push` | apply `prisma/schema.prisma` to the database |
| `npm run db:seed` | wipe and reload the fixture data |
| `npm run db:reset` | `db push --force-reset` + `db:seed` |
| `npm run db:studio` | Prisma Studio against the Neon branch |

`prototype/` still holds the week 8 static prototype. It is a design reference
and nothing in the app renders from it — `app/globals.css` is the only copy of
the design system now, so a style change is made there and only there.

## 4. Environment variables

Copy `.env.example` to `.env.local`, or let the Neon CLI write it
(`neon deploy` pulls the branch's variables).

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | **yes** | Pooled Postgres connection string. Used by the app at runtime. |
| `DATABASE_URL_UNPOOLED` | for DDL | Direct endpoint. `prisma db push` and migrations need it; PgBouncer cannot run DDL. |
| `AUTH_SECRET` | no (week 10) | Cookie signing key for the real auth provider. `openssl rand -base64 32`. |
| `NEXT_PUBLIC_APP_URL` | no | Absolute URLs in outbound links. Set to the deployed origin. |
| `DEEPSEEK_API_KEY` | no | **First** provider. Empty means the chain starts at ChatAnywhere. |
| `DEEPSEEK_BASE_URL` | no | Default `https://api.deepseek.com`. |
| `DEEPSEEK_MODEL` | no | Default `deepseek-flash`. |
| `DEEPSEEK_VISION_MODEL` | no | Image-input model used when a deck is rendered to pictures; default `deepseek-flash`. |
| `CHATANYWHERE_API_KEY` | no | **Second** provider. Empty means the chain starts at OpenRouter. |
| `CHATANYWHERE_BASE_URL` | no | Default `https://api.chatanywhere.tech/v1`. |
| `CHATANYWHERE_MODEL` | no | Default `gpt-4o-mini`. |
| `CHATANYWHERE_VISION_MODEL` | no | Separate image-input model; default `gpt-4o-mini`. |
| `LLM_MIN_GAP_MS` | no | Minimum gap between two model calls, default `4000`. Raise it if a 429 shows up. |
| `OPENROUTER_API_KEY` | no | The spare. Used only when the earlier providers decline — no key, 429, bad key, empty reply. |
| `OPENROUTER_MODEL` | no | Pins one model instead of the spare's free-tier chain. |
| `OPENROUTER_VISION_MODEL` | no | Explicit image-input model; the text-only free chain is never used for vision. |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | no | Read by nothing. |

All three keys being empty is a **supported state**: `/studio` falls back to the
built-in template and the screen says `Model: template-v1`. Nothing else in the
app calls a model.

Never commit `.env.local`. `.gitignore` already covers `.env` and `.env*.local`;
`.env.example` is the file that is meant to be committed.

## 5. Deploy to Vercel

One-time, about ten minutes. Two of those minutes are the environment variables —
the build fails without them, because `next build` evaluates every page and every
page reads the database through `getSession()`.

**Current status: deployed from `main`.** The week 9–10 work was merged in PR #1
on 2026-11-10. `feat/end-to-end-prototype` and `feat/platform-postgres` were
deleted after the merge, so `main` is the only branch and the only thing Vercel
builds.

1. If you are deploying your own copy, import the repository and leave the
   production branch at `main`.
2. In Vercel: **Add New → Project → Import** `comp5241-project1`, and set the
   production branch to `main`.
3. Framework preset: **Next.js** (detected). Leave build command, output
   directory and install command at their defaults — `postinstall` already runs
   `prisma generate`, and `build` runs it again before `next build`.
4. **Environment variables** — the two database strings are required, in
   Production *and* Preview:

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | the pooled string (`-pooler` in the host) |
   | `DATABASE_URL_UNPOOLED` | the direct string, no `-pooler` |

   Copy both out of `.env.local`. **They do not have to point at the same Neon
   project as your local build.** The URL above runs against a different Neon
   project than the developer machine does, which is why `/courses` shows eight
   courses there and seven locally: both are correct, they are two seeds. Point
   your own deploy at whichever project you own — just do not run `db:reset`
   against someone else's. `prisma generate` does not connect,
   but any page that renders does, and a missing variable surfaces as
   `Environment variable not found: DATABASE_URL` at build time.

   Then add the model keys, if you want generation to call a model on the
   deployed URL: `DEEPSEEK_API_KEY` first, `CHATANYWHERE_API_KEY` second, and
   optionally `OPENROUTER_API_KEY` as the spare. Without any of them, the
   deployed studio still generates courses from the template and the screen says
   so. Add them to Production and Preview separately — Vercel does not copy
   variables between environments.

5. **Deploy.**

After that, every pull request gets its own preview URL. That is deliberate: a
review comment can point at the preview, so a reviewer clicks a finished task and
lands on the thing it describes instead of reading a description of it.

**Production URL: <https://comp5241-project1.vercel.app/>**

Verified 2026-11-10 from a machine with no session cookie: `/` answers `200` and
renders the Praxis workspace (title `Praxis — AI course studio for software
engineering`); `/learn`, `/studio` and `/insights` answer `307` to `/login`,
which is the role guard doing its job rather than an error. First request after
a cold start took ~5 s; the pages themselves are server-rendered on demand.

### Two things a serverless default will break

**1. Function duration.** Vercel's default limit for a function is 10 s, and a
generation measured on this machine takes **13.6 s** end to end — one model call
plus the activity bodies. The model call alone re-measured **4.4 s** on
2026-11-11 against ChatAnywhere, so the 13.6 s is the pessimistic end of the
range rather than a fixed cost; both are above what a 10 s limit survives
comfortably. Without a higher limit the request is killed halfway and the studio
shows a timeout rather than a course. Both routes that call a model therefore
declare:

```ts
export const maxDuration = 60;   // app/studio/page.tsx, app/path/page.tsx
```

If your plan caps below 60, the number is a ceiling, not a promise: raise the
plan's limit or expect generation to fail on the deployed URL and work locally.
This is the single most likely thing to go wrong on the first deploy.

**2. The throttle is per instance.** `lib/llm.ts` serialises calls through one
in-memory queue and spaces them by `LLM_MIN_GAP_MS`. On a serverless platform
each instance has its own memory, so two simultaneous visitors can be two
instances and the queue cannot see the other one. The free tier's rate limit is
per key, not per instance, so concurrent generation can still earn a 429.

What that costs in practice: the 429 handler waits for `Retry-After` and retries
once, so a collision is slow rather than broken. What would fix it properly is
the queue moving out of process — a row lock or a `pg_advisory_lock` on the
Neon database, which is already there. Not done, because the demo has one
instructor generating at a time and the lock would be a second source of truth
to reason about. Write it down rather than pretend the guard is global.

### Does the code have to be on GitHub first?

Vercel itself does not require it. `npx vercel deploy` uploads the working
directory and builds it, with no repository involved. That path is not used
here, for three reasons:

1. **A static `index.html` used to sit at the repository root.** Before the
   merge, importing the repository gave Vercel a folder containing `prototype/`,
   `docs/` and that file — a GitHub Pages site, not a Next.js app. It has been
   removed, so the preset now resolves on its own; if a deploy still builds a
   static copy, the framework preset is wrong.
2. **A CLI deploy cannot be traced to a commit.** The dashboard shows an
   upload, not a SHA, so "this URL is the code we reviewed" stops being
   checkable — which is the whole point of a preview link in a review.
3. **Previews come from pull requests.** A CLI deploy produces one URL; a pull
   request produces one per change, and that only exists when Vercel is watching
   the repository.

So: merge first, then import. If the repository cannot be pushed at all, the
CLI is a legitimate fallback for a demo — write down that the URL was uploaded
rather than built from `main`, because the difference matters at review time.

### Do not run `db:seed` or `db:reset` against a database you do not own

A deployment and a developer machine can point at two different Neon projects —
the URL above does. The `db:*` scripts are local tools that read `.env.local`,
and they are destructive: whichever project that file names is the one they wipe.

So the question is not "which environment am I in" but "which connection string
is in front of me". Check it before running either script:

```bash
node -e "const u=new URL(process.env.DATABASE_URL);console.log(u.host)"
```

The in-app reset button on `/settings` does the same thing deliberately, and is
admin-only for that reason. On a public URL it is reachable by anyone who can set
a cookie — see below.

Schema changes are `npm run db:push` from a developer machine, once, and they
apply to whichever database that machine is pointed at. A deploy on a different
Neon project needs its own `db:push` before it will render anything.

### Before the URL is shared with anyone outside the group

The session is a demo switcher, not authentication: `praxis_uid=u-tse` in a
cookie makes you an admin, and `/login` lists that user by name. On a public URL
that means anyone can reach `/settings` and press the reset button.

Nothing is lost if they do — the reset only re-inserts the fixture — but it is
worth knowing before a demo. The one-line mitigation, if you want it, is to gate
`resetDemoDataAction` on an environment variable that is only set in development.

### Deployment checklist (run before every merge to `main`)

- [ ] `npm run build` passes locally
- [ ] The preview URL opens and `/courses` renders at least six courses, with the
      extra drafts (if any) marked as drafts
- [ ] `/learn` as a learner shows the shelf of six courses, not a single course
- [ ] `/studio` → **Generate outline** finishes on the deployed URL. This is the
      one that fails if `maxDuration` is missing or the plan caps below it: a
      13.6 s generation against a 10 s limit dies halfway
- [ ] `/studio` names the provider it will use (`ChatAnywhere · gpt-4o-mini` or
      `template-v1`), and the name matches the keys you actually set
- [ ] The preview root (`/`) shows the Praxis workspace, **not** the static
      `prototype/index.html` — if it shows the prototype, the project was
      detected as "Other" instead of "Next.js"
- [ ] The course editor saves: change a module title, reload, the change survives
- [ ] `/admin` redirects to `/login` when signed in as an instructor, and renders
      when signed in as admin
- [ ] `/settings` opens (it used to be a dead `href="#"`)
- [ ] No secret in the diff (`git diff | grep -iE "sk-|password|secret|neon\.tech"`)

## 6. Database operations (Neon)

The project is linked to a Neon project through `neon.ts`; `.neon` holds the local
link and is gitignored.

```bash
neon login                 # once per machine
neon deploy                # apply the branch policy, pull DATABASE_URL into .env.local
npm run db:push            # create/align tables from prisma/schema.prisma
npm run db:seed            # wipe and reload fixture data
```

**Driver choice.** The app runs in the Node.js runtime (server components and
server actions), not Edge, and Neon's pooled URL is PgBouncer in transaction
mode — exactly what Prisma's query engine needs. So the plain `PrismaClient`
against `DATABASE_URL` is the right tool, and there is no driver adapter in the
dependency tree. If a route ever moves to Edge, add
`@prisma/adapter-neon` + `@neondatabase/serverless`; `lib/store.ts` would not
change shape.

**Connection handling.** `lib/db.ts` caches the client on `globalThis`. Next.js
reloads modules on every hot update, and serverless functions are frozen rather
than shut down; without the singleton each reload or invocation opens a new pool.

**Two connection strings, on purpose.** `DATABASE_URL` (pooled) for queries,
`DATABASE_URL_UNPOOLED` (direct) for `db push` and migrations, declared as
`directUrl` in the schema. Mixing them up produces the classic "prepared
statement already exists" error.

**Reset.** `npm run db:reset` drops and rebuilds the schema, then re-seeds. It is
destructive by design — do not run it against a branch with real student data.

## 7. Rollback

Vercel keeps every deployment. **Deployments → pick the last good one →
Promote to Production.** No rebuild, no downtime beyond the swap.

If a bad merge reached `main`, prefer `git revert <sha>` over a force push: the
history is part of the evidence we are graded on.

## 8. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Module not found: Can't resolve '@/…'` | `tsconfig.json` paths not picked up | delete `.next/`, restart `npm run dev` |
| Every page 500s with `Environment variable not found: DATABASE_URL` | `.env.local` missing | `neon deploy`, or paste the strings from the Neon console |
| `prepared statement "s0" already exists` | pooled URL used for DDL, or two clients per instance | use `DATABASE_URL_UNPOOLED` for `db push`; confirm `lib/db.ts` singleton is intact |
| `Can't reach database server` | branch suspended, or wrong region | Neon console → wake the branch; check the host in the string |
| Tables exist but pages are empty | schema pushed without seeding | `npm run db:seed` |
| `/admin` bounces to `/login` | signed in as instructor | pick **A. Tse** on the sign-in page |
| `/studio` generation dies at ~10 s on the deployed URL | the plan caps the function below `maxDuration` | raise the plan limit; see §5 |
| Build fails on `useSearchParams` | page not marked dynamic | add `export const dynamic = "force-dynamic"` |
| `prisma generate` fails in CI | client generated before install | `npm ci` runs `postinstall`; check the lockfile is committed |

## 9. What this deployment does *not* do yet

- **No real authentication.** The session cookie is unsigned and names a demo
  user, so anyone who can set `praxis_uid` is whoever they name — including the
  admin. Fine for a marked demo, not for real students.
- **No code execution sandbox.** The code lab's "Run checks" is a substring test
  over the editor contents (`mustInclude`), not a test run. It can tell that a
  learner wrote the right call; it cannot tell that the call works.
- **No cross-instance rate limit.** `lib/llm.ts` serialises calls in memory, which
  is one queue per process. See §5 for what that means on a serverless platform.
- **No browser-driven end-to-end suite.** `docs/test-plan.md` §4 specifies one.
  What exists instead is a set of `node --test` unit tests over the pure parts of
  the pipeline — `npm run test:quiz`, `test:studio-quality`, `test:ai-audit`,
  `test:studio-input`, `test:analytics`, `test:r4-demo` — plus a click-through run
  of all 32 cases in `docs/manual-test-checklist.md`, whose results are in
  `docs/test-report.md`. Nothing drives a real browser automatically, so "the
  button moves the row" is still checked by hand.
- **Mini-games, narrated slides, language switching.** Modelled in the schema and
  the copy, and the player card reserves a slot for them. **Not built** — R3 lists
  both formats, and these are the two of the eight without a player. The slot is
  empty, not closed: the taxonomy already accepts `game` and `narrated_slides`,
  so adding a player does not need a schema change. What is wrong today is that
  the course editor offers both formats as choices, so an instructor can assign
  one and the learner silently receives a reading article while the activity pill
  still says `Mini-game`. That is D-24, open, and it is R4's renderer that closes
  it, not a `select` option removal by R3.

Each of these is either a limit of the demo build or an open slot, and it is
recorded here rather than left to be discovered at review.
