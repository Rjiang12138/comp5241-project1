# Deployment

Everything a new teammate — or a marker who wants to check our claims — needs to
get Praxis running locally and on a public URL. Written for the week 9 skeleton;
it gets a version bump whenever the deployment changes.

Last verified: 2026-10-22, commit on `feat/platform-base`.

---

## 1. What runs, and what is still mock

| Area | State |
| --- | --- |
| App shell, routing, design system | real |
| Course editor (modules, activities, ordering, publishing, versions) | real — writes to Postgres |
| Admin (create cohort, assign instructor) | real — writes to Postgres |
| Session and role guard | real, demo provider (cookie) |
| Studio generation log, learner code lab, insights charts, path builder | prototype markup, interactions from `prototype/js/app.js` |
| Database | **Postgres on Neon**, wired through Prisma |
| LLM calls | **not wired yet** — no key is read anywhere in the app |

Data lives in a Neon Postgres branch (`production`). `lib/store.ts` is the only
module that talks to it; everything else speaks its signatures.

## 2. Prerequisites

- Node.js **20 or newer** (`node -v`)
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

Open <http://localhost:3000>. You land as **Dr. R. Kwok** (instructor) so nothing
has to be set up to look around. `/login` switches role — pick **A. Tse** to see
the admin console.

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
| `npm run port:prototype` | re-run the HTML→JSX converter for one screen |

The mid-term prototype is still in `prototype/` and still opens from the file
system. It is the visual reference: **change the design there first**, then
re-run the converter, so the two never drift.

## 4. Environment variables

Copy `.env.example` to `.env.local`, or let the Neon CLI write it
(`neon deploy` pulls the branch's variables).

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | **yes** | Pooled Postgres connection string. Used by the app at runtime. |
| `DATABASE_URL_UNPOOLED` | for DDL | Direct endpoint. `prisma db push` and migrations need it; PgBouncer cannot run DDL. |
| `AUTH_SECRET` | no (week 10) | Cookie signing key for the real auth provider. `openssl rand -base64 32`. |
| `NEXT_PUBLIC_APP_URL` | no | Absolute URLs in outbound links. Set to the deployed origin. |
| `OPENROUTER_API_KEY` | no | Enables the model-backed path in the course generator. **Empty is a supported state**: `/studio` falls back to the built-in template and says so on screen. |
| `OPENROUTER_MODEL` | no | Pins one model instead of the default free-tier chain (`poolside/laguna-s-2.1:free` → `nvidia/nemotron-3-ultra-550b-a55b:free`). |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | no (week 10) | Read by nothing yet. |

Never commit `.env.local`. `.gitignore` already covers `.env` and `.env*.local`;
`.env.example` is the file that is meant to be committed.

## 5. Deploy to Vercel

One-time, about ten minutes. Two of those minutes are the environment variables —
the build fails without them, because `next build` evaluates every page and every
page reads the database through `getSession()`.

1. Push `main` to GitHub.
2. In Vercel: **Add New → Project → Import** `comp5241-project1`.
3. Framework preset: **Next.js** (detected). Leave build command, output
   directory and install command at their defaults — `postinstall` already runs
   `prisma generate`, and `build` runs it again before `next build`.
4. **Environment variables** — both are required, in Production *and* Preview:

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | the pooled string (`-pooler` in the host) |
   | `DATABASE_URL_UNPOOLED` | the direct string, no `-pooler` |

   Copy both out of `.env.local`; they are the same Neon project the local build
   uses, so the preview reads the same rows. `prisma generate` does not connect,
   but any page that renders does, and a missing variable surfaces as
   `Environment variable not found: DATABASE_URL` at build time.

   Optionally add `OPENROUTER_API_KEY` as well. Without it the deployed studio
   still generates courses, using the template; with it, generation calls a
   model. Add it to Production and Preview separately — Vercel does not copy
   variables between environments.

5. **Deploy.**

After that, every pull request gets its own preview URL. That is deliberate:
the board links to the preview, so a reviewer can click a finished task and land
on the thing it describes instead of reading a description of it.

Production URL: `<fill in after the first deploy>`

### Does the code have to be on GitHub first?

Vercel itself does not require it. `npx vercel deploy` uploads the working
directory and builds it, with no repository involved. That path is not used
here, for three reasons:

1. **`main` has no `package.json`.** Until the branch is merged, importing the
   repository gives Vercel a folder containing `prototype/`, `docs/` and a
   static `index.html` — a GitHub Pages site, not a Next.js app. The framework
   preset has to be set to **Next.js** by hand or the build is a static copy.
2. **A CLI deploy cannot be traced to a commit.** The dashboard shows an
   upload, not a SHA, so "this URL is the code we reviewed" stops being
   checkable — which is the whole point of the preview link on a board card.
3. **Previews come from pull requests.** A CLI deploy produces one URL. The
   board's definition of done asks for a URL per finished task, and that only
   exists when Vercel is watching the repository.

So: merge first, then import. If the repository cannot be pushed at all, the
CLI is a legitimate fallback for a demo — write down that the URL was uploaded
rather than built from `main`, because the difference matters at review time.

### Do not run `db:seed` or `db:reset` on the deployed database

There is one database, not one per environment. The `db:*` scripts are local
tools that point at `.env.local`; running them against the same Neon project
from a deployed environment would wipe the rows the preview is showing. The
in-app reset button on `/settings` does the same thing deliberately, and is
admin-only for that reason.

Schema changes are `npm run db:push` from a developer machine, once, and they
apply to the single database everything shares.

### Before the URL is shared with anyone outside the group

The session is a demo switcher, not authentication: `praxis_uid=u-tse` in a
cookie makes you an admin, and `/login` lists that user by name. On a public URL
that means anyone can reach `/settings` and press the reset button.

Nothing is lost if they do — the reset only re-inserts the fixture — but it is
worth knowing before a demo. The one-line mitigation, if you want it, is to gate
`resetDemoDataAction` on an environment variable that is only set in development.

### Deployment checklist (run before every merge to `main`)

- [ ] `npm run build` passes locally
- [ ] The preview URL opens and `/courses` renders six courses
- [ ] The preview root (`/`) shows the Praxis workspace, **not** the static
      `index.html` that GitHub Pages uses — if it shows the static one, the
      project was detected as "Other" instead of "Next.js"
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
| A ported screen has no interactivity | `PrototypeScripts` not mounted | confirm `app/layout.tsx` still renders it |
| Build fails on `useSearchParams` | page not marked dynamic | add `export const dynamic = "force-dynamic"` |
| `prisma generate` fails in CI | client generated before install | `npm ci` runs `postinstall`; check the lockfile is committed |

## 9. What this deployment does *not* do yet

- No real authentication — the session cookie is unsigned and names a demo user.
- No code execution sandbox — the code lab is still a prototype screen.
- No LLM calls — nothing in the app reads an API key.
- No automated end-to-end suite — `docs/test-plan.md` specifies it, week 10 writes it.

Each of these is a named week 10 task on the board, not an oversight.
