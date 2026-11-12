# Praxis Final Project Report

Implementation, testing and deployment report

*Praxis GenAI Course Studio*

| Document | Final project report |
| --- | --- |
| Version | 1.0 |
| Evidence date | 12 November 2026 |
| Repository | github.com/Rjiang12138/comp5241-project1 |

Evidence statement This document distinguishes repository claims, static code review, commands executed on 12 November 2026, and live HTTP checks. It does not claim an unperformed browser walkthrough, database mutation test, or production deployment action.

## Document contents

- Executive summary

- Project scope and requirements

- System design and implementation

- Role based workflows

- Testing report

- Deployment guide

- Security and operational limitations

- Conclusions and next work

- Evidence register

## Executive summary

Praxis is a Next.js 15 and PostgreSQL web application for turning lecture material or a short teaching brief into an interactive mini course. Instructors can generate and edit course structures, publish versions, manage cohorts and inspect event based learning analytics. Learners can enrol, complete activities and build a self directed learning path. Administrators manage cohort ownership and may restore the demonstration dataset.

The reviewed main branch is a complete demonstration system rather than a production learning platform. Server side role checks protect routes and actions, and persistent features use Prisma with Neon PostgreSQL. Authentication is intentionally a passwordless demo identity cookie. Mini games, narrated slides and language switching are not implemented. The deployment documentation also records that preview and production may share a database and that the in memory LLM throttle is not global across serverless instances.

Our independent verification on 12 November 2026 used repository commit 4adef12. TypeScript checking and the production build completed successfully. The six declared unit test suites contained 62 tests: 61 passed and one failed. The failing AI audit test raised TypeError because the test harness did not provide a redirect function expected by the course editor page. We therefore report the suite as failed in this run even though the repository test report records 62 of 62 passing on an earlier run. Anonymous production requests returned 200 for the landing page and login page, and 307 redirects to login for courses and studio. No authenticated production workflow or database write was performed in this verification.

## Project scope and requirements

### Problem and intended users

Praxis addresses the preparation and delivery of short software engineering learning experiences. The system gives teaching staff a visible generation workflow and lets learners move through activities rather than consume an undifferentiated playlist. It supports three roles: admin, instructor and learner, labelled Student in this report and the accompanying manual.

| Role | Primary outcome | Main routes |
| --- | --- | --- |
| Admin | Maintain cohorts, teaching assignments and demo data | /admin, /courses, /settings |
| Instructor | Generate, edit, publish and analyse courses | /studio, /courses, /insights |
| Student learner | Join courses, complete activities and build a path | /learn, /path, /settings |

### Implemented functional scope

- Course generation from a brief or supported uploaded teaching material, with template fallback when no model key is configured.

- Course editing for modules, activities, formats, time budgets, publishing, version snapshots, roster import and CSV export.

- Learner shelf and player for reading, simulation, code lab, role play, quiz and peer review activities, with staged hints and a grounded tutor interface.

- Event based progress and analytics, including cohort filters, nudge lists and exports.

- Self directed path generation that reuses published courses and marks library gaps.

- Admin cohort creation and instructor reassignment, plus an admin only demonstration reset.

### Explicit exclusions

- Mini games and narrated slides are represented in the data model but have no dedicated learner renderer.

- The application is English only. Locale exists in the data model, but language switching is not built.

- The demo session cookie is not production authentication and must not protect real student records.

- There is no automated end to end browser suite. The repository uses unit tests, build checks, curl checks and a manual checklist.

## System design and implementation

### Technology stack

| Layer | Technology | Reviewed responsibility |
| --- | --- | --- |
| Web | Next.js 15 App Router, React 19, TypeScript | Server rendered pages, server actions and route handlers |
| Data | Prisma 6 and PostgreSQL on Neon | Courses, cohorts, enrolments, events, versions and AI audit records |
| Generation | DeepSeek, ChatAnywhere, OpenRouter or template fallback | Queued JSON completion with provider fallback and audit metadata |
| Deployment | Vercel | main branch deployment and preview builds |
| Quality | Node test runner, TypeScript and Next build | Unit suites, static checking and production compilation |

### Architecture and request flow

Pages in app are server components. Authentication helpers in lib auth read the praxis_uid cookie and enforce requireUser, requireStaff or requireRole before protected content is rendered. Most database access is centralized in lib store. Learner actions append events, and analytics derives progress from those events instead of storing a separate progress value.

| Stage | Primary component | Result |
| --- | --- | --- |
| Sign in | app login and lib auth | Demo user cookie and server checked role |
| Author | studio, generate, author and llm | Course tree plus optional AI audit records |
| Persist | lib store and Prisma | Course, modules, activities and versions in PostgreSQL |
| Learn | learn page and LearnPlayer | Activity attempts and completion events |
| Measure | insights and course analytics | Aggregates calculated from the append only event log |

### Data model

The Prisma schema defines User, Cohort, Course, Module, Activity, Enrollment, Event, CourseVersion, AiRun, AiReview, PromptVersion, LearningPath and PathStep. Event is append only by design. CourseVersion stores a publish snapshot so version comparisons can use the actual course tree. AiRun stores provider, model, prompt version, latency and token fields when available; AiReview links an explicit staff review to a published version.

### Generation and fallback behavior

The provider chain is DeepSeek, ChatAnywhere and OpenRouter when corresponding keys are present. Calls go through completeJson, which owns the queue, spacing, Retry After handling and attempt budget. With no provider key, the studio produces a template based draft and reports template-v1. PDF visual analysis is opt in and uses separate vision model configuration. The current server action upload limit is 16 MB, but the deployment documentation warns that Vercel can reject larger request bodies before Next.js processes them.

## Role based workflows

### Administrator workflow

The administrator signs in as the demo admin, opens Admin, creates or assigns cohorts, and may inspect all courses. Settings exposes the destructive demo data reset only to admin. Reassignment is intended to update both the cohort and attached course owners in one transaction. The repository test report records an earlier defect in this path and says it was fixed in code but had not been re verified on the deployed URL at the time of that report.

### Instructor workflow

An instructor opens Studio, supplies a brief or accepted files, chooses audience and time, then generates a draft. The course editor supports inline module and activity changes, roster import, content filling, publishing, version history and cohort statistics. Publishing AI generated material requires an explicit review control. Access checks distinguish staff status from course ownership, although the repository test report explains that the deployed commit it tested previously did not yet include the ownership fix.

### Student workflow

A student opens My learning, joins a published course and completes activities. Progress and minutes are computed from logged events. The player exposes activity navigation, format specific controls, staged hints and an AI tutor area. The path builder accepts a goal, domain, starting point, weekly time and duration; it reuses available courses and marks an uncovered step as a gap.

## Testing report

### Independent verification on 12 November 2026

| Check | Observed result | Status |
| --- | --- | --- |
| npm run test studio input | 32 pass, 0 fail | Pass |
| npm run test studio quality | 6 pass, 0 fail | Pass |
| npm run test quiz | 5 pass, 0 fail | Pass |
| npm run test ai audit | 12 pass, 1 fail | Fail |
| npm run test analytics | 4 pass, 0 fail | Pass |
| npm run test r4 demo | 2 pass, 0 fail | Pass |
| npm run typecheck | Exit 0 with no TypeScript errors | Pass |
| npm run build | Exit 0; 14 application routes reported | Pass |
| Production anonymous HTTP | / and /login 200; /courses and /studio 307 to login | Pass for checked surface |

The failing AI audit case was named the course editor shows recorded usage and an explicit review control. It raised TypeError redirect is not a function while rendering CourseEditorPage through the repository test loader. This result may indicate test harness drift rather than an application runtime defect, but no corrective change was made and the test remains failed for this verification.

### Repository supplied test evidence

docs test report records an earlier main branch run with 62 unit tests passing, 32 manual cases run, 30 passing and two failing. Its manual run covered course editor, admin, access and deployment smoke cases across local and production environments with stated differences. These are project supplied results, not results repeated during this document review.

| Area | Project supplied result | Important qualification |
| --- | --- | --- |
| Course editor | 12 run, 11 pass, 1 fail | Local only; non positive minutes reset to 8 |
| Admin | 6 run, 5 pass, 1 fail | Local only; reassignment defect recorded and fixed in code |
| Access and session | 9 run, 9 pass | curl plus browser checks |
| Deployment smoke | 5 run, 5 pass | Some checks local or build based |
| UAT | 0 rounds | Not run |

### Open defects and risks

| Item | State | Operational effect |
| --- | --- | --- |
| D 24 game and narrated slides | Open | Editor can select formats without a dedicated player |
| D 25 invalid minutes handling | Open | Zero or negative values become the default without explanation |
| D 26 no upper minutes bound | Open | Unrealistic values such as 9999 are accepted |
| D 29 draft learner preview | Open | Draft preview can show the learner shelf instead of the draft |
| AI audit test harness | Failed in this review | One declared unit test cannot render the editor under its mock environment |
| Authenticated production workflows | Not re tested here | No new claim about production writes or role screens |

## Deployment guide

### Prerequisites

- Node.js 22 or newer and npm 10 or newer.

- A Neon PostgreSQL project with pooled and direct connection strings.

- Access to the GitHub repository and a Vercel account for hosted deployment.

- Optional model provider keys. The application supports template fallback without them.

### Local deployment

1. Clone the repository and enter its directory.

2. Run npm install. The postinstall script generates the Prisma client.

3. Create .env.local with DATABASE_URL and DATABASE_URL_UNPOOLED. Keep it out of version control.

4. Run npm run db:push to create the schema through the unpooled endpoint.

5. Only on an isolated database you own, run npm run db:seed. This truncates fixture owned tables.

6. Run npm run dev and open http://localhost:3000.

7. Before release, run all six test scripts, npm run typecheck and npm run build.

### Vercel deployment

1. Import the GitHub repository and select main as the production branch.

2. Use the detected Next.js framework settings and default build command.

3. Add DATABASE_URL and DATABASE_URL_UNPOOLED to both Production and Preview environments.

4. Optionally add DEEPSEEK_API_KEY, CHATANYWHERE_API_KEY and OPENROUTER_API_KEY in the intended environments.

5. Deploy, then verify landing, login redirects, authenticated role routes, one safe write and one generation path.

6. Record the deployed commit and database branch. Do not reset a shared database during verification.

### Environment variables

| Variable | Requirement | Purpose |
| --- | --- | --- |
| DATABASE_URL | Required | Pooled runtime connection |
| DATABASE_URL_UNPOOLED | Required for DDL | Direct connection for schema operations |
| DEEPSEEK API variables | Optional | First provider and model configuration |
| CHATANYWHERE API variables | Optional | Second provider and vision configuration |
| OPENROUTER API variables | Optional | Spare provider and optional pinned models |
| LLM_MIN_GAP_MS | Optional | Per process call spacing, default 4000 ms |
| NEXT_PUBLIC_APP_URL | Optional | Absolute origin for outbound links |

### Rollback and troubleshooting

Vercel rollback should select a previously successful deployment. A database rollback is separate because Prisma db push does not create a reversible migration history here. Preserve data before schema changes. For generation timeouts, confirm maxDuration remains 60 on studio and path and confirm the hosting plan permits it. For 429 responses, inspect provider logs and Retry After handling; increasing the local in process gap does not coordinate separate serverless instances.

## Security and operational limitations

- Authentication: praxis_uid identifies a demo user without a password or signature. Replace it before using real personal or educational records.

- Authorization: protected pages and actions use server checks. Continue testing direct links and POST actions, not only sidebar visibility.

- Data separation: deployment documentation warns that preview and production can share one Neon branch. Use separate branches for safe review and reset operations.

- Destructive operations: db seed, db reset and the Settings reset clear data. Restrict them to owned demonstration databases.

- Provider limits: the queue is in process. It does not enforce a global rate across concurrent serverless instances.

- Uploads: hosting request size may be lower than the application limit. Validate realistic lecture decks on the deployed platform.

## Conclusions and next work

The repository supports a coherent end to end demonstration of course authoring, learning activity delivery and event based analytics. The code compiles and builds on the reviewed commit, and 61 of 62 declared unit tests passed in this independent run. The evidence does not support a claim of production readiness because authentication is demonstrative, four product defects remain open, one unit test failed in the current environment, and authenticated production workflows were not repeated.

The next release should repair the AI audit test harness or the editor dependency it exposes, close the time validation and preview defects, prevent selection of unimplemented formats or implement their renderers, isolate production and preview databases, and replace the demo session mechanism. A complete acceptance run should then execute the repository manual checklist against the exact deployed commit and record UAT with both instructor and learner participants.

## Evidence register

| Evidence | Use in this document | Verification level |
| --- | --- | --- |
| README.md, HANDOVER.md, AGENTS.md | Scope, architecture, known limitations, operating rules | Repository review |
| DEPLOYMENT.md and .github workflow | Local and Vercel setup, environment variables, CI | Repository review |
| docs requirements, architecture, test plan and test report | Traceability, defect history, existing manual results | Repository review; existing results attributed |
| app, components, lib and Prisma schema | Roles, routes, controls, persistence and data model | Static code review |
| Local commands on commit 4adef12 | Unit tests, typecheck and production build | Executed 12 Nov 2026 |
| Production HTTP requests | Anonymous landing, login and access redirects | Executed 12 Nov 2026 |
| Referenced ChatGPT conversation | Requested deliverables and repository identity | Conversation review |
