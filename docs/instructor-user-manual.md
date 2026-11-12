# Praxis Instructor User Manual

Course generation, editing, publishing and analytics

*Praxis GenAI Course Studio*

| Document | Instructor user manual |
| --- | --- |
| Version | 1.0 |
| Evidence date | 12 November 2026 |
| Repository | github.com/Rjiang12138/comp5241-project1 |

Evidence statement This document distinguishes repository claims, static code review, commands executed on 12 November 2026, and live HTTP checks. It does not claim an unperformed browser walkthrough, database mutation test, or production deployment action.

## Document contents

- About this manual

- Sign in and workspace

- Generate a course

- Edit a course

- Publish and review versions

- Manage a cohort roster

- Use insights and exports

- Troubleshooting

- Evidence register

## About this manual

This manual is for the Praxis instructor. It explains how to generate a draft, edit course content, publish reviewed versions and inspect learning evidence. Control labels follow the reviewed main branch at commit 4adef12. The production site may contain different data from a local seed, so course and cohort counts can differ without indicating an error.

### Known limits before use

- The model line identifies whether generation uses a provider or template-v1 fallback.

- Mini games and narrated slides are not implemented in the learner player even though the editor can list them.

- The application is English only. Draft preview also has a documented open defect.

- Publishing AI generated content requires an explicit review action.

## Sign in and workspace

1. Open Login.

2. Choose Dr. R. Kwok or Dr. M. Chan.

3. Confirm the sidebar identifies the Instructor role.

4. Use Studio to generate, Courses to edit, Insights to analyse and Settings to manage the display name or session.

## Generate a course

### Prepare the source

Use a concise teaching brief or supported text and PDF material. The repository tests enforce file count and exact size boundaries and reject blank, malformed or unreadable input. PDF visual analysis is opt in. When visual analysis is disabled, image only content may not become course source material.

### Create the draft

1. Open Studio and read the Model label. Record template-v1 if no provider key is active.

2. Enter the course brief or select the permitted teaching files.

3. Choose audience and session length.

4. For a PDF with important diagrams, enable visual analysis and select only the needed page range.

5. Choose Generate outline and wait. Generation can take longer than a normal page request.

6. Review the generated modules, activities, time total and generation log before opening the editor.

Do not describe template-v1 output as model generated prose. It is the supported degraded path. If a provider attempt is rejected, the audit record and fallback outcome should remain distinct.

## Edit a course

### Course settings

In the course editor, change Title, Brief, Audience and Time budget, then save. A blank title becomes Untitled course. Time fields currently have incomplete validation: zero or negative activity minutes can become 8 without an explanation, and very large values are not capped.

### Modules and activities

1. Rename a module in its inline field and leave the field to submit.

2. Use the up and down controls to reorder a module.

3. Use Add module to append a module.

4. Within a module, edit activity title, format and minutes using the row controls.

5. Use Add activity to create a new row. The default reading activity is eight minutes.

6. Delete only after checking the target. Module deletion also removes its activities.

### Choose supported formats

| Format | Learner behavior |
| --- | --- |
| Reading | Article content and completion |
| Quiz | Answer options and feedback |
| Code lab | Starter code, checks, hints and solution |
| Simulation | Scenario choices |
| Role play | Learner response and reviewer pushback |
| Peer review | Rubric guided review |
| Mini game | Not built |
| Narrated slides | Not built |

### Fill activity bodies

Use Fill activity bodies when the course has sufficient source prose and activities need content. Review the result. The content lookup order is hand written text, Activity payload, then fallback. A payload does not override existing hand written text.

## Publish and review versions

1. Review every module and activity, including generated wording, quiz answers and code checks.

2. Use the explicit review control for AI generated material.

3. Publish the next version.

4. Confirm the course status, version number and Versions list changed.

5. Open version history to compare stored snapshots. Only versions with a snapshot can produce a real diff.

Code lab checks are substring assertions, not execution of a real test suite. Describe them accurately to students and reviewers.

## Manage a cohort roster

The course editor shows the assigned cohort, enrolled learners and progress summaries. Roster import accepts one learner per line in the displayed format and accepts Moodle style columns according to the interface guidance. Validate a small sample after import before relying on totals.

1. Open the course editor and locate Cohort.

2. Paste or import the roster using the on screen format.

3. Submit the import.

4. Check names, emails and learner counts.

5. Export CSV when an authorized offline record is required.

## Use insights and exports

Insights derives completion and attempts from the event log. Choose 7 days, 30 days or All, then review the descriptive counts and nudge list. The analytics tests deliberately suppress causal or ranked claims for zero and very small samples. Treat the page as evidence for follow up, not as a causal diagnosis.

## Troubleshooting

| Symptom | Interpretation | Action |
| --- | --- | --- |
| Model label says template-v1 | No active provider key | Continue with fallback or ask the deployment owner to configure a key |
| Generation times out | Function duration or provider delay | Confirm maxDuration and hosting limit; retry only after checking logs |
| 429 response | Provider rate limit | Wait for Retry After and check shared key use |
| Another instructor course opens unexpectedly | Ownership regression or older deployment | Do not edit; record identity, course and URL |
| Draft learner view shows the shelf | Known preview defect | Use published test data or inspect the editor instead |
| Format displays as reading content | Unsupported game or narrated slides | Change to a supported format |

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
