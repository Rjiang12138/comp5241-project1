# Week 9 project meeting — briefing

**Praxis** — turning lecture material into adaptive mini-courses
COMP5241 Software Engineering · group project · week 9

---

## 1. Where we are

The mid-term prototype was six static screens. Since then the platform behind them
has been built: a Next.js application, a Postgres database, a session with role
guards, and server actions that make the instructor screens write to it. The
screens themselves are unchanged — the prototype is the source of truth for the
interface, and every screen in the app is generated from it by a converter rather
than re-typed.

| Layer | State | Evidence |
| --- | --- | --- |
| Interface, 6 screens | complete, visually identical to the prototype | `prototype/` has one commit and no edits since |
| Application, Next.js 15 App Router | three surfaces wired to the database | course editor 55 of 57 controls, `/admin` 5 of 5, `/settings` 6 of 6 |
| Data, Postgres on Neon + Prisma | live and seeded | 6 courses · 20 modules · 22 activities · 24 learners |
| AI generation pipeline | not started | scheduled week 10 |
| Deployment, automated tests | pipeline written, never executed | scheduled week 11 |

## 2. System design

```
browser ──form POST──▶ server action ──▶ lib/store.ts ──▶ Prisma ──▶ Neon Postgres
                            │
                            └── revalidatePath ──▶ the same page re-renders
```

Three decisions shape everything else.

**No hand-written API layer.** Every mutation is a server action. The form posts,
the action validates, the store writes, the page re-renders. There is no REST
endpoint to keep in sync with the UI and no client-side fetch for course data, so
a screen cannot drift out of step with the schema it writes to.

**The prototype owns the interface.** `tools/html_to_tsx.py` converts
`prototype/*.html` into the React components under `components/ported/`. Behaviour
is added around the markup, not inside it. This is why the app looks exactly like
the artefact that was reviewed in week 7, and why a design change is a one-line
edit in one file followed by a re-run, not a sweep through six screens.

**Ten tables, one writer.** `users`, `cohorts`, `courses`, `modules`, `activities`,
`enrollments`, `events`, `course_versions`, `ai_runs`, `prompt_versions`.
`lib/store.ts` is the only module that writes; pages read through it. The
`unique(courseId, position)` constraint on modules is what makes reordering and
deletion awkward, and the renumbering logic lives in one place because of it.

## 3. Against the brief

| Requirement | State |
| --- | --- |
| R1–R3 mini-courses, topic coverage, seven activity formats | interface complete; five of seven formats modelled; games and AI narration specified, not built |
| R4–R5 audience adaptation and personalisation | rules and registers present in the UI; execution needs the generation step |
| R6–R7 instructor editing and AI course generation | editing is live and writes to the database; generation week 10 |
| R8 cohort import and engagement tracking | cohorts and instructor assignment live; Moodle/CSV import still a mock |
| R10 learner-defined paths | screen present, behaviour week 10 |
| R11 iterative prototyping | round 1 wireframes → round 2 hi-fi prototype → this build |
| R12 each member contributes visibly | ownership table in `midterm-update.md` §7; issues and PRs per feature |
| R13 public repository | present; the platform branch is merged in week 10 |
| R14 stakeholder and user interviews | scheduled this week |
| R15 AI Fluency reflection | `docs/ai-usage-log.md` |
| R16 deploy to a public platform | pipeline ready, production URL week 11 |

## 4. Division of work

Four vertical slices, one per member, each owning a feature from screen to data
rather than a horizontal layer.

| Workstream | Covers | Where it shows |
| --- | --- | --- |
| Product & AI pipeline | framing, prompt registry, generation checks, evaluation | generation flow, `ai-usage-log.md` |
| Learning runtime | player, code lab, hint ladder, activity state | the learner screen |
| Instructor surface | editor, cohorts, analytics | editor, cohort table, analytics |
| Platform & experience | design system, auth, deployment, CI | design system, build and deploy pipeline |

Shared and rotating: requirement interviews, prototype reviews, documentation,
slides. Names and student IDs are on the week 3 group-formation form.

## 5. What we are not claiming

- **Three surfaces write to the database, four do not.** The course editor, the
  cohort registry and settings are live. The studio form, the learner player, the
  path builder and the analytics page are still prototype markup. We will demo the
  first three and describe the rest as designed, not built.
- **There is no authentication.** The session is a role switcher for demonstration;
  it is not a login. Real accounts are out of scope for week 11.
- **No AI call has been made.** Every outline seen so far is fixture data. The
  generation step lands in week 10, and the interface will say which mode produced
  a course.

## 6. Next three weeks

| Week | Work |
| --- | --- |
| 9 | learner runtime and hint ladder; interviews; merge the platform branch |
| 10 | generation pipeline against a real model; path builder; analytics queries |
| 11 | deploy, automated smoke tests, demo video, slides, report, user manuals |

---

# Appendix — for us, not part of the handout

## A. If you are the one talking (eight minutes)

The brief asks for a group discussion of five to ten minutes, not a solo talk, and
it does not say who speaks. This is the running order if it falls to you.

| Time | Say | Do |
| --- | --- | --- |
| 0:00 | "Praxis turns a lecturer's own material into a short course, and adapts the wording to who is reading it." | — |
| 1:00 | Point at the six screens; say the interface is the week 7 prototype, unchanged. | open `/` |
| 2:00 | "This is the part that did not exist in week 7." Change a module title, reload. | `/courses/c-sef` |
| 4:00 | Show the cohort registry: create a class, assign an instructor, it persists. | `/admin` |
| 5:30 | Reset the demo data from the browser, so the next run starts clean. | `/settings` |
| 6:30 | Name the limits out loud — three surfaces wired, four still markup, no AI yet, no deploy yet. | — |
| 7:30 | Next three weeks, one sentence each. | — |

The one thing not to do: click a control on the four prototype screens. They look
alive and do nothing. If asked to, say so before clicking.

## A2. If you are not the one talking

Then the handout is the deliverable and the demo is somebody else's problem. What
is still yours is the sixty seconds when the platform comes up, because nobody
else can answer for it:

> "The six screens were static in week 7. The platform underneath them now exists:
> Postgres, a session with role guards, and server actions, so the instructor
> screens write to the database and stay written. The interface did not change —
> it is generated from the prototype files, so the design that was reviewed cannot
> drift."

Two things to watch for while someone else drives:

- **Overclaiming.** The most likely sentence on the day is "our AI generates the
  course". It does not, yet. §5 of the handout is the correction, and it is easier
  to say it first than to walk it back.
- **A dead button being clicked.** If a control on the studio, learner, path or
  analytics screen is pressed and nothing happens, the honest line is "that screen
  is still the prototype; the behaviour lands in week 10" — and it should be said
  immediately, not after a second attempt.


## B. Questions likely to come up

| Question | Answer |
| --- | --- |
| "Why does it look exactly like the prototype?" | Because it is the same markup. A converter generates the components from the prototype files, so the reviewed design cannot drift. |
| "Where is the AI?" | Not connected yet. The generation step is week 10. Everything generated so far is fixture data and is labelled as such. |
| "Can I log in?" | No. It is a role switcher for demonstration, not authentication. |
| "Who did what?" | The four workstreams in §4. Commits, issues and the board carry the detail. |
| "Why is the repository not up to date?" | The platform branch is merged in week 10, once the learner runtime is in it. |
| "What if the model generates a wrong course?" | The instructor approval gate: nothing reaches learners without an explicit accept step. |

## C. Optional paragraph on workstream status

Whether to say this out loud is your call, not mine. If you decide to, put it in
§4 and change the sentence about names.

> As of week 9, commits and pull requests exist only for the Platform & experience
> slice. The other three workstreams have produced design work in the prototype but
> no code yet; the platform layer and the instructor screens were built ahead of
> them so that those slices have something to plug into rather than a blank
> repository.

That sentence is true, it does not accuse anyone, and it sets a date. If the other
three are still silent by week 10, the same paragraph becomes a problem statement
rather than an explanation, and it should be raised in writing rather than at a
meeting.
