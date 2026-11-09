# R4 local demonstration data

The R4 demo uses synthetic accounts and events. They show how the screens work;
they are not research findings or evidence of real student behaviour. No AI run,
model output, usage count or teacher review is fabricated by the demo seed.
Generate a new Studio course to demonstrate real model calls and review.

## Prepare a local database

Create a **new, empty local PostgreSQL database** for the demo. Do not use the
team's shared database. Install the project dependencies and configure the
optional model settings in `.env.local` as described in `.env.example`.

In PowerShell, set the following example URL to your own local database and
password. These variables affect only this PowerShell session:

```powershell
$env:R4_DEMO_DATABASE_URL = "postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/praxis_r4_demo?schema=public"
$env:DATABASE_URL = $env:R4_DEMO_DATABASE_URL
$env:DATABASE_URL_UNPOOLED = $env:R4_DEMO_DATABASE_URL
npx prisma db push
npm run demo:r4:seed
npm run demo:r4:material
npm run dev
```

`prisma db push` is intended here for the new, empty local database; do not run
it against a shared database as part of this guide. `demo:r4:seed` refuses a
missing or non-loopback URL, inserts inside a transaction and never truncates,
updates or deletes existing rows. Its reserved IDs start with `r4-demo-`.
If the demo course already exists, it does nothing, so rerunning it preserves
the course and any additional work. If another reserved ID is already in use,
the transaction fails rather than overwriting it. Recreate the isolated database
only when you intentionally want a fresh demo.

The material command creates `.tmpcheck/r4-demo/r4-demo-architecture.pdf` if it
does not exist, without overwriting an existing file. The PDF is a synthetic
Client → API → Database diagram with no private information.

## Walkthrough

1. Sign in as **DEMO Teacher**. In Studio, upload the generated PDF, enter a
   brief such as “Explain how the client, API and database connect to each other
   for beginners”, select page 1, and generate a course. Diagram reading sends
   that page to the configured vision provider. With no provider, choose a
   text-only or brief-only demo; vision requests require a compatible provider.
2. Open the generated course, inspect the visual observations and audit record,
   then confirm teacher review before publishing. If a fallback was used, say so.
3. Sign in as **DEMO Learner 1** and open **DEMO — Client, API and Database**.
   The seeded course already has a reading, a quiz and a simulation. Finish the
   quiz to produce a new event during the demo.
4. Sign in as **DEMO Teacher**, open Insights and select the R4 demo course if
   needed. The screen labels its simulated activity. Initially there are six
   enrolled learners and ten completed activities out of 18 possible pairs
   (56% average progress); actual clicks change those numbers.

The older `npm run db:seed` and `npm run db:reset` replace existing data and are
not used in this walkthrough. `npm run test:r4-demo` checks the URL guards.
