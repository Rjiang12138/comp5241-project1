# Praxis Student User Manual

Courses, activities, progress and learning paths

*Praxis GenAI Course Studio*

| Document | Student user manual |
| --- | --- |
| Version | 1.0 |
| Evidence date | 12 November 2026 |
| Repository | github.com/Rjiang12138/comp5241-project1 |

Evidence statement This document distinguishes repository claims, static code review, commands executed on 12 November 2026, and live HTTP checks. It does not claim an unperformed browser walkthrough, database mutation test, or production deployment action.

## Document contents

- About this manual

- Sign in and find courses

- Join and continue a course

- Complete activities

- Use hints and the AI tutor

- Build a learning path

- Manage profile and session

- Troubleshooting

- Evidence register

## About this manual

This manual is for the Praxis student learner. It explains how to join courses, complete supported activities, use learning support and build a personal path. Control labels follow the reviewed main branch at commit 4adef12. The production site may contain different data from a local seed, so course and cohort counts can differ without indicating an error.

### Known limits before use

- The site uses demo identities without passwords. Do not enter sensitive personal information.

- Progress comes from recorded activity events. It is not a manually editable percentage.

- Mini games, narrated slides and language switching are not available.

- The AI tutor is a learning aid. Check course source material and instructor guidance when an answer is unclear.

## Sign in and find courses

1. Open Login.

2. Choose one of the learner identities such as Mei Wong or Arjun Lee.

3. Open My learning.

4. Check the course cards for Not joined, Not started, In progress or Finished.

The shelf shows course modules, activity count, estimated minutes, completed activities and logged minutes. Your instructor sees progress derived from the same event records.

## Join and continue a course

1. For a course marked Not joined, choose Start or Enrol.

2. For a joined course, choose Start, Continue or Review according to its state.

3. Use the activity list to move to a specific activity.

4. Use Previous and Next to navigate. At the end, return to the path or another course.

## Complete activities

| Activity | What to do |
| --- | --- |
| Reading | Read the course text and mark the activity complete |
| Quiz | Choose an answer and read the feedback |
| Code lab | Edit the response, run the provided substring checks and use hints when needed |
| Simulation | Choose an action and review the consequence |
| Role play | Write a response and address the reviewer feedback |
| Peer review | Use the displayed rubric to review the work |

A code lab check does not execute a full program or unit test suite. It checks for expected text patterns. Follow instructor instructions when a real development environment is required.

## Use hints and the AI tutor

### Staged hints

Reveal hints one at a time so you can keep working before viewing a solution. The player records attempts and completions. A hint is support, not proof that the submitted answer is correct.

### AI tutor

1. Open the AI tutor panel in an activity.

2. Choose the explanation register if offered, such as plain, analogy or formal.

3. Select a suggested question or type your own question about the current activity.

4. Read the grounded or refused status. A refusal means the tutor did not produce a supported answer.

5. Compare important answers with the activity content and ask the instructor when needed.

## Build a learning path

1. Open My path or Build a path.

2. Describe what you want to be able to do.

3. Choose a domain, starting point, hours per week and number of weeks.

4. Generate the path and review every step.

5. Choose Start for a step linked to a course.

6. A step marked gap has no matching library course. Use Generate a new course if available or ask the instructor.

7. Mark a step complete or reopen it. Use Swap when another suitable course is available.

A path may use template-v1 or a configured model. The model label describes how the path was produced; it does not certify that the sequence is appropriate for assessment or degree planning.

## Manage profile and session

Open Settings to change Display name. Email and role are read only. Language is fixed to English for this build. Use Sign out when finished, especially on a shared computer. Switch role is a demonstration function and may replace the current identity.

## Troubleshooting

| Symptom | Likely reason | Action |
| --- | --- | --- |
| Protected page returns to login | No active demo session or wrong role | Choose a learner identity again |
| Course is missing | Not published, different database or no access | Ask the instructor to confirm publication and environment |
| Progress did not change | Completion event was not recorded or page is stale | Reload once; then report course and activity |
| Activity looks like an article despite another label | Unsupported game or narrated slide format | Report it to the instructor |
| Tutor refuses | Question could not be grounded | Use course content or ask the instructor |
| Path shows a gap | No suitable published course exists | Generate a course if permitted or ask for guidance |

### Report a problem

Record the site URL, the learner identity, course title, activity title, expected result and what happened. Do not include model keys, database strings or sensitive personal information. If the issue changes data, stop repeating the action until the instructor has reviewed it.

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
