# AI usage log — Anthropic's 4D framework in practice

This is a working log, not a retrospective. Entries are written the day they happen, including the
ones that make us look bad. It exists for three reasons: we cannot evaluate a prompt change without a
record, the brief asks us to reflect on AI Fluency, and a reviewer should be able to check any claim we
make on a slide.

Framework: **Delegation** (what we hand over) · **Description** (how we specify it) ·
**Discernment** (how we judge the output) · **Diligence** (how we verify and own it).

## 1. Rules of engagement

1. Agents may write code we would have written ourselves; they may not decide the schema, the API
   contracts, the security model, or what counts as done.
2. Every prompt that produced merged code is stored here with the constraint that shaped it.
3. A generated diff is read line by line before merge. "It runs" is not a review.
4. No one presents code they cannot explain live. If you cannot defend it, it does not ship.
5. Generated tests must fail before the implementation exists. A test that passes against an empty
   function is worse than no test.
6. Nothing generated goes to learners without an instructor approving it. Approval is recorded.
7. We do not ask a model for numbers about our users. Numbers come from `events`, or they are labelled
   as seed data.
8. When the agent is wrong, the correction goes in this file. The failure is the useful part.

## 2. Log

| # | Date | Task | D | What we asked | Outcome | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 10-14 | Design tokens & component CSS | Delegation | "Design system for a course platform: tokens, cards, buttons, tables, no framework." | 640 lines, coherent, but every page hard-coded its own spacing | accepted after extracting spacing scale |
| 2 | 10-14 | Landing page copy | Description | "Explain the product in one sentence for a course instructor, no adjectives." | first draft was 40 words and full of "seamlessly" | rejected, rewritten by hand |
| 3 | 10-15 | Generated outline sample content | Delegation | "Write five module titles for a 45-minute intro to software engineering for non-CS students." | usable titles, but generic activities ("watch a video", "take a quiz") | kept structure, replaced activities |
| 4 | 10-15 | Code lab starter + tests | Discernment | "Vitest specs for a createUser validation rule; tests must fail against the current stub." | one spec was `expect(() => createUser(...)).not.toThrow()` — passes trivially | rejected, rewrote assertions |
| 5 | 10-16 | Hint ladder copy | Description | "Two hints, escalate from concept to code, never give the full answer." | hint 1 gave the complete guard clause | rejected: it collapsed the exercise |
| 6 | 10-17 | Cohort analytics numbers | Diligence | "Realistic engagement data for a 24-person cohort over 8 weeks." | the model produced confident, internally consistent, entirely invented numbers | **removed from UI**, replaced with seeded data and labelled "prototype seed" |
| 7 | 10-18 | SVG engagement chart | Delegation | "Area chart, 8 points, grid, target line, one annotated point, no library." | correct geometry, wrong baseline (axis started at the data minimum) | accepted after setting the scale explicitly |
| 8 | 10-19 | Mid-term document structure | Description | "Outline a progress update against this rubric; do not write the prose." | usable headings, prose was unusable when we tried it | structure kept, prose written by us |

## 3. Three cases worth presenting

### 3.1 Accepted with edits — the design system (#1)

We delegated the token layer and component CSS because it is high-volume, low-judgement work. The
first output was good at the component level and bad at the system level: each block repeated its own
`padding: 18px 20px` instead of referencing a scale. Editing it was faster than rewriting, but the
lesson was about *description*: "design system" without "single spacing scale, no magic numbers" gets
you a component library, not a system.

### 3.2 Rejected — the test that could not fail (#4)

The agent produced three specs; two asserted real behaviour, one asserted that the function did not
throw. That spec passes against the empty stub, so it certifies nothing. We caught it by running the
suite against the stub before writing the implementation — a one-minute check that we now do by
default. This is the concrete answer to "how do you know the agent's tests are any good": run them
against a wrong implementation first.

### 3.3 Removed from the product — invented analytics (#6)

We asked for "realistic engagement data" and received a plausible, precise, fabricated dataset. It
looked like evidence, which is exactly why it was dangerous — it would have gone into a slide as a
finding. We deleted it, seeded the analytics screen from a fixed fixture, and added the chip
*"Live data from prototype seed"* in the UI so nobody can mistake it for measurement. The rule that
came out of this: **numbers about users come from `events` or they are labelled**.

## 4. Metrics we track

| Metric | Why | Current |
| --- | --- | --- |
| Share of merged lines that were agent-generated | honest answer to "which parts did AI write" | tracked per PR, ~35% at mid-term |
| Accepted-without-edit rate | measures description quality | low for UI copy, high for fixtures and CSS |
| Reverted agent commits | measures discernment failures | 2 so far (both test-related) |
| Time from prompt to merge | tells us whether delegation is actually saving time | ~2× faster on scaffolding, ~1× on logic |

## 5. What we would tell another team

- Write the constraint, not the wish. "No library, 8 points, fixed axis" gets a usable chart; "make a
  nice chart" does not.
- Keep the failures. The two rejected tests taught us more about verification than any tutorial.
- The most dangerous output is not broken code — it is plausible content. Broken code fails loudly;
  invented evidence does not.
- Delegation is a design decision. Deciding *what not to hand over* is the skill being assessed.
