# Submission text (ready to paste)

**Repository:** <https://github.com/Rjiang12138/comp5241-project1>

---

## Progress update (short version)

We are building **Praxis**, a GenAI course studio that turns lecture material into interactive
mini-courses for software engineering education. The instructor brings a slide deck or a short brief;
Praxis drafts the module sequence, generates the activities (code labs, stakeholder simulations,
design-review role plays), and adapts explanations and hint depth to the learner's background — a
business student and a CS graduate get the same course in different registers. Learners can also state
their own goal and have a four-week path assembled for them.

At the mid-term milestone the interaction model is complete and clickable: six screens covering the
instructor studio (brief → generated outline with an auditable generation log), course and cohort
management with adaptation rules and version history, the learner code lab with staged hints and a
three-register AI tutor, cohort insights that turn activity data into one recommended intervention, and
a self-directed path builder. The prototype is plain HTML/CSS/JS with no build step, so it can be
reviewed by opening `prototype/index.html`. The backend (Next.js + Postgres + grounded LLM pipeline) is
what weeks 9–11 are for.

Two findings so far shaped the design. First, a generation step that is visible and logged builds more
instructor trust than a spinner — they can see why a module exists and delete it. Second, dashboards
that report everything and recommend nothing get ignored; the insights screen proposes exactly one
change and links it to the evidence.

## What is in the repository

| Path | Contents |
| --- | --- |
| `prototype/` | six-screen clickable prototype (`index`, `studio`, `course`, `learn`, `analytics`, `path`) |
| `docs/midterm-update.md` | full progress update: rationale, walkthrough, traceability, plan |
| `docs/screenshots/` | the six screens at 2× resolution |
| `docs/requirements.md` | requirement-by-requirement traceability against the project brief |
| `docs/architecture.md` | target architecture, data model, generation pipeline |
| `docs/ai-usage-log.md` | AI Fluency 4D log, including two rejected outputs and one removed feature |

## Screens

1. `docs/screenshots/index.png` — landing page and value proposition
2. `docs/screenshots/studio.png` — instructor brief → generated outline with generation log
3. `docs/screenshots/course.png` — course, activities, cohort, adaptation rules
4. `docs/screenshots/learn.png` — learner code lab, failing test, staged hint, AI tutor
5. `docs/screenshots/analytics.png` — cohort insights and recommended intervention
6. `docs/screenshots/path.png` — self-directed four-week path builder

## How to review it

```bash
git clone https://github.com/Rjiang12138/comp5241-project1.git
cd comp5241-project1
python -m http.server 8080 --directory prototype
# open http://localhost:8080
```

Or simply open `prototype/index.html` in a browser — no installation, no network access required.
