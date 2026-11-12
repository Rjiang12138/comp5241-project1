# Praxis Admin User Manual

Cohort, assignment and demonstration data operations

*Praxis GenAI Course Studio*

| Document | Admin user manual |
| --- | --- |
| Version | 1.0 |
| Evidence date | 12 November 2026 |
| Repository | github.com/Rjiang12138/comp5241-project1 |

Evidence statement This document distinguishes repository claims, static code review, commands executed on 12 November 2026, and live HTTP checks. It does not claim an unperformed browser walkthrough, database mutation test, or production deployment action.

## Document contents

- About this manual

- Sign in and navigation

- Manage cohorts

- Review courses and analytics

- Manage account and demo data

- Safe operating procedures

- Troubleshooting

- Evidence register

## About this manual

This manual is for the Praxis administrator. It explains how to create cohorts, assign instructors, review platform data and reset demonstration records safely. Control labels follow the reviewed main branch at commit 4adef12. The production site may contain different data from a local seed, so course and cohort counts can differ without indicating an error.

### Known limits before use

- Sign in is a demo identity switcher, not production authentication.

- Resetting demo data deletes current rows and restores fixtures. Use it only on a database you are authorized to clear.

- The repository test report says cohort reassignment was fixed in code but had not been re verified on the deployed URL in that report.

## Sign in and navigation

1. Open the Praxis site and choose Login.

2. Select A. Tse, the demo admin identity. Protected routes read this role on the server.

3. Confirm the sidebar shows Admin and the name A. Tse.

| Navigation item | Use |
| --- | --- |
| Courses | Open all course records and editors |
| Studio | Generate a course draft |
| Insights | Review event based cohort analytics |
| Admin | Create cohorts and change teaching assignments |
| Settings | Manage display name, session and demo reset |

## Manage cohorts

### Create a cohort

1. Open Admin.

2. Enter a non empty cohort code and the requested cohort details shown by the form.

3. Choose an instructor.

4. Submit the form.

5. Confirm the new row displays the expected code and instructor.

### Reassign an instructor

1. In Admin, locate the cohort.

2. Choose the replacement instructor and submit the assignment change.

3. Confirm the cohort row shows the new instructor.

4. Open attached courses and confirm their owner also changed. If only the cohort changes, stop and record the cohort and course identifiers; this matches an earlier defect.

### Validate learner counts

Compare the learner count shown on the cohort row with the course roster or enrolment list. Counts are database queries. A mismatch should be recorded before any reset or reassignment so the original state remains available for diagnosis.

## Review courses and analytics

### Open a course

Admins can reach all course records from Courses. The editor shows course settings, modules and activities, enrolled learners, progress summaries, versions and generation audit records. Use learner view only as a check; the repository records an open defect where a draft preview may lead to the learner shelf instead of the draft.

### Use Insights

1. Open Insights.

2. Choose a 7 day, 30 day or All range.

3. Review participation, progress and the nudge list.

4. Use export only when the data is appropriate to share. The export route also applies server side role checks.

## Manage account and demo data

### Change the display name

Open Settings, edit Display name and choose Save. Names require at least two characters. Email and role are read only because they define the demo identity and authorization context.

### Switch or end a session

Choose Sign out in Settings to clear the cookie. Use Switch role only for demonstration work. Do not interpret a successful role switch as an authentication security test.

### Reset demonstration data

Warning This action clears every table used by the fixture and re inserts demonstration data. It is not an undo command for a single course.

1. Confirm the current database is an isolated demonstration database that you are permitted to clear.

2. Open Settings and locate Demo data.

3. Type RESET exactly to enable the control.

4. Run the reset and wait for the completion message.

5. Confirm the fixture summary appears. If the operation fails, do not repeat it against another environment until the database target is verified.

## Safe operating procedures

| Operation | Before | After |
| --- | --- | --- |
| Cohort reassignment | Record cohort and course owners | Check both cohort and courses |
| Roster or course export | Confirm authorized audience | Store or transmit securely |
| Demo reset | Confirm isolated owned database | Confirm fixture counts and sign in |
| Deployment review | Record commit and database branch | Run role, write and redirect checks |

## Troubleshooting

| Symptom | Likely cause | Action |
| --- | --- | --- |
| Admin redirects to login | Current user is not admin | Sign out and choose the admin identity |
| Empty cohort code creates nothing | Validation rejected the form | Enter a non empty code |
| Cohort owner changes but courses do not | Reassignment regression or older deployment | Record evidence and contact the project maintainer |
| Reset control is disabled | Confirmation does not equal RESET | Type RESET exactly |
| Counts differ from documentation | Different Neon seed or prior test data | Check database environment and current records |

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
