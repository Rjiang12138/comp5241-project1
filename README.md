# Praxis — a GenAI course studio for software engineering education

**COMP5241 Software Engineering · Group project · Semester 1 2026/27**

Praxis turns lecture material into interactive mini-courses. An instructor brings a slide deck or a
one-paragraph brief; Praxis drafts the module sequence, builds the activities (code labs, role plays,
stakeholder simulations), and adapts the wording to each learner's background. Learners get a path,
not a playlist — they can also generate their own.

> **Status: the platform runs end to end.**
> A deck or a brief goes in at `/studio`, a course comes out, learners play it at
> `/learn`, and every click writes an `Event` that `/insights` and the course
> editor read back. Progress, attempts, cohort tables, CSV export and version
> diffs are queries over that log — none of them are fixtures. Roles are enforced
> on the server (`requireStaff` / `requireRole`), not in the sidebar.
>
> Two activity formats are modelled but not built: mini-games and narrated
> slides. The screens say so instead of showing an empty card. Language switching
> is English-only for the same reason — it is stated, not implied.
>
> The mid-term prototype is untouched in [`prototype/`](prototype) and remains
> the visual reference for every screen.

![Landing page](docs/screenshots/index.png)

---

## Quick start

```bash
npm install
# one-time: put DATABASE_URL + DATABASE_URL_UNPOOLED in .env.local
#   (neon init && neon login && neon deploy does it for you)
npm run db:push      # create the tables
npm run db:seed      # load the prototype fixture data
npm run dev          # http://localhost:3000
```

Data lives in a Neon Postgres branch. `/` is public; every other route asks who
you are first and returns you to where you were going. `/login` lists three
staff and three learners — pick **A. Tse** to see the admin console, or one of
the learners to see `/path` and `/learn`.

| Route | What it is | Owner |
| --- | --- | --- |
| `/` | landing | R1 |
| `/studio` | **upload a deck, get a course** — audience, length, generation log | R4 |
| `/courses` | course list | R3 |
| `/courses/[id]` | **course editor** — modules, activities, ordering, publishing, versions, cohort stats, roster import, CSV export | R3 |
| `/courses/[id]/versions` | version diff, only where a snapshot was written | R3 |
| `/learn` | **my courses** — the shelf of six published courses, then the player: eight activity formats, hints, tutor, checkpoints | R2 |
| `/insights` | cohort analytics over the event log | R4 |
| `/path` | self-directed path builder | R5 |
| `/admin` | **cohorts and teaching assignments** | R3 |
| `/login` | role switch | R3 |

## Repository layout

```
app/                  Next.js App Router
  globals.css         the design system, carried over from the prototype's stylesheet
  additions.css       components the prototype did not have (editor, admin, sign-in)
  page.tsx            landing — reads the busiest course, no hard-coded copy
  courses/            list + editor, with server actions in actions.ts
  studio|learn|insights|path/   real screens, each rendered through components/Shell.tsx
components/
  Shell.tsx           sidebar + topbar; every screen renders through it
  StudioWorkspace.tsx the three-column generation screen
  AutoSubmitInput.tsx inline fields that save their form on blur
lib/
  types.ts            domain types, mirroring prisma/schema.prisma
  store.ts            data access over Prisma
  llm.ts              the model seam: ChatAnywhere, then OpenRouter, both throttled
  generate.ts         deck or brief → outline → activities with bodies
  author.ts           writes activity bodies from prose a course already has
  auth.ts             session + role guard
  format.ts           label/pill mapping
prisma/schema.prisma  data model (cohorts, courses, modules, activities, events, ai_runs)
prototype/            the week 8 prototype, kept outside this repo as a visual reference
docs/                 progress update, requirements, architecture, AI log, test plan, board guide
.github/              issue and PR templates, CI
```

## What used to be here

Weeks 9–10 converted the prototype's HTML into JSX and mounted it, so the app and
the prototype could be compared side by side. Every screen has since been
replaced by a real component and `components/ported/` is gone: `/studio` and `/`
were the last two, and both were rendering a second copy of the sidebar with the
course count typed into the markup. The design system in `app/globals.css` is the
part worth keeping, and it is still the place to change a style.

## What works

| Interaction | Where |
| --- | --- |
| Generate a course outline from a deck or a one-sentence brief, with a step-by-step generation log | `/studio` → **Generate outline** |
| Write every activity's body — reading, cloze quiz, code lab, simulation, role play, peer review — from the material the course already has | automatic at generation and at publish, or **Fill activity bodies** on the editor |
| Switch audience (non-CS / CS / mixed) and session length | `/studio` |
| Inspect modules, per-activity completion, version history, cohort stats, roster import, CSV export | `/courses/[id]` |
| Six published courses a learner can join and play, with progress read from the event log | `/learn` |
| Toggle the AI tutor between plain / analogy / formal explanations; staged hints; code-lab checks | `/learn?course=…` |
| Sequence existing courses into a four-week path, and mark the steps the library cannot fill | `/path` |
| Cohort analytics over `events`, with a nudge list | `/insights` |
| Cohorts and teaching assignments | `/admin` (admin only) |
| Reset the demo data to the fixture | `/settings` |

Everything above reads and writes Postgres. There is no markup-only screen left;
the prototype was a design reference and its ported components are gone.

## Team

Five workstreams, one per member. Each is a vertical slice of the product — one
person owns a feature from screen to data — rather than a horizontal layer.

| Workstream | Owns | Screens |
| --- | --- | --- |
| R1 演讲 | narrative, the pitch, the live demo | landing |
| R2 制片 | course player, code lab, hinting, activity state | `/learn` |
| R3 平台 | platform base, course editor, admin, deployment, testing | `/courses`, `/admin`, deploy + CI |
| R4 AI 与数据 | generation pipeline, prompt registry, analytics | `/studio`, `/insights` |
| R5 内容 | content, handbooks, peer-evaluation run | `/path` |

Names and student IDs are on the week 3 group-formation form.

## Documents

- [Deployment](DEPLOYMENT.md)
- [Test plan](docs/test-plan.md)
- [Working the board](docs/board.md)
- [Mid-term progress update](docs/midterm-update.md)
- [Requirement traceability](docs/requirements.md)
- [Architecture](docs/architecture.md)
- [AI usage log (4D)](docs/ai-usage-log.md)
