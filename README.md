# Praxis — a GenAI course studio for software engineering education

**COMP5241 Software Engineering · Group project · Semester 1 2026/27**

Praxis turns lecture material into interactive mini-courses. An instructor brings a slide deck or a
one-paragraph brief; Praxis drafts the module sequence, builds the activities (code labs, role plays,
stakeholder simulations), and adapts the wording to each learner's background. Learners get a path,
not a playlist — they can also generate their own.

> **Status: mid-term milestone (Week 8).**
> A high-fidelity, clickable prototype is complete and lives in [`prototype/`](prototype).
> Screenshots are in [`docs/screenshots/`](docs/screenshots).
> The production build (Next.js + Postgres + LLM provider) starts in Week 9.

![Landing page](docs/screenshots/index.png)

---

## Quick start

The prototype is plain HTML, CSS and JavaScript — no build step, no dependencies, no network calls.

```bash
# option 1: just open it
start prototype/index.html          # Windows
open  prototype/index.html          # macOS

# option 2: serve it (recommended, keeps relative links consistent)
python -m http.server 8080 --directory prototype
# then visit http://localhost:8080
```

Screens: `index.html` (landing) · `studio.html` (instructor authoring) · `course.html` (course &
cohort) · `learn.html` (learner code lab) · `analytics.html` (insights) · `path.html` (self-directed
path builder).

## Repository layout

```
prototype/            clickable prototype (static HTML/CSS/JS)
  css/styles.css      design system: tokens, components, layout
  js/app.js           interactions: generation log, test runner, tutor modes, path builder
docs/
  midterm-update.md   Week 8 progress update (the submitted document)
  requirements.md     requirement traceability against the project brief
  architecture.md     target architecture and technical decisions
  ai-usage-log.md     AI Fluency 4D log: what we delegated, prompted, checked, recorded
  screenshots/        six prototype screens, 2x resolution
tools/
  trim_screenshots.py helper used to trim the captured screenshots
```

## What works in the prototype

| Interaction | Where |
| --- | --- |
| Generate a course outline from a brief, with a step-by-step generation log | `studio.html` → **Generate outline** |
| Switch audience (non-CS / CS / mixed) and session length | `studio.html` |
| Inspect modules, per-activity completion, version history | `course.html` |
| Toggle the AI tutor between plain / analogy / formal explanations | `learn.html` |
| Run tests in the code lab (2 → 3 passing, checkpoint unlocks) | `learn.html` |
| Reveal a staged hint | `learn.html` → **Ask for a hint** |
| Regenerate a four-week learning path | `path.html` → **Design my path** |

All data is seeded in the markup. There is no backend yet; this prototype exists to validate the
interaction model and the information architecture before we commit to an implementation.

## Team

Four members, four vertical workstreams (names and student IDs are on the week 3 group-formation
form).

| Workstream | Owns |
| --- | --- |
| Product & AI pipeline | brief → outline generation, prompt registry, evaluation |
| Learning runtime | course player, code lab, hinting, activity state |
| Instructor & data | course editor, cohorts, analytics |
| Platform & experience | design system, auth, deployment, CI |

## Documents

- [Mid-term progress update](docs/midterm-update.md)
- [Requirement traceability](docs/requirements.md)
- [Architecture](docs/architecture.md)
- [AI usage log (4D)](docs/ai-usage-log.md)
