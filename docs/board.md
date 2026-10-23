# Working the board

The brief asks each member to demonstrate sufficient contribution, and the
rubric penalises "participation evident but uneven". Neither is settled by a
paragraph in the report claiming everyone worked hard. It is settled by a board
where the work is visible per person, per week, with links to the commits that
did it.

Owner: R3 平台. Reviewed in the Monday standup.

---

## 1. Columns

| Column | Meaning | Rule |
| --- | --- | --- |
| **Backlog** | agreed, not started | has a requirement ID or it does not belong here |
| **This week** | committed for the current week | max 3 per person; more is a wish, not a plan |
| **In progress** | someone is actively on it | one per person, ideally |
| **Review** | PR open, preview deployed | the PR link goes in the issue |
| **Done** | merged to `main` and verified on the preview | see definition of done |

## 2. Labels

| Group | Values | Why |
| --- | --- | --- |
| `owner:` | `r1-talk` `r2-video` `r3-platform` `r4-ai-data` `r5-content` | the five workstreams from the division-of-work table |
| `req:` | `R1` … `R17` | ties the issue to `docs/requirements.md`, which the report cites |
| `type:` | `feature` `bug` `docs` `test` `infra` | what kind of work it is |
| `area:` | `platform` `editor` `admin` `runtime` `pipeline` `analytics` | which part of the product it touches |
| `severity:` | `blocker` `major` `minor` `cosmetic` | bugs only |
| `week:` | `w9` `w10` `w11` `w12` | makes "what did we do in week 10" a one-click filter |

An issue without `owner:` and `req:` is invisible to the report. That is the
whole reason for the labels.

## 3. Milestones

One per week, closing Friday: `Week 9 — platform base`, `Week 10 — runtime and
editor`, `Week 11 — deploy, test, document`, `Week 12 — presentation`.

Closing a milestone is not a formality. Anything still open on Friday moves to
next week *explicitly*, in the standup, out loud. Silent carry-over is how a
project looks finished and is not.

## 4. The weekly ritual

**Monday, 15 minutes.** Walk the board left to right. Anything in *This week*
without an owner gets one or goes back to the backlog. Anything blocked gets a
comment naming the blocker and the person who can clear it.

**Wednesday, async.** Comment on every *In progress* issue: what changed since
Monday. One sentence is enough. Three issues with no comment is a signal.

**Friday, 20 minutes.**
1. Close what is done. Verify on the preview URL first — "it works locally" does
   not close an issue.
2. Move what is not done to next week's milestone, with a reason.
3. Update `docs/requirements.md` if a requirement's status changed.
4. Post the week's summary in the issue labelled `week:wN`.

## 5. Definition of done

An issue is done when all five are true:

- [ ] merged to `main` (not just pushed to a branch)
- [ ] verified on the preview deployment
- [ ] `npm run build` green in CI
- [ ] the issue has an **Evidence** line: preview URL, screenshot, or test name
- [ ] if it changed behaviour a user can see, `docs/requirements.md` is updated

Four out of five is not done. The one that gets skipped is always the evidence
line, and the evidence line is the one the report needs.

## 6. Reading contribution off the board

Three views, all built from the same labels — no separate spreadsheet:

1. **By person:** filter `owner:r3-platform`, group by milestone. Shows what R3
   committed to each week and what closed.
2. **By week:** filter `week:w10`, sort by closed date. Shows the shape of the
   week, including who was quiet.
3. **By requirement:** filter `req:R8`. Shows whether the thing the brief asked
   for actually got built, and by whom.

For the final report, screenshot all three. That is the "supporting evidence of
effort and contribution" the brief asks for, and it takes two minutes to produce
because it was maintained weekly rather than reconstructed in week 11.

## 7. One-time setup

1. **Projects → New project → Board**, name it `Praxis`.
2. Add the five columns above as a single-select field `Status`.
3. Create the labels in §2 (`Settings → Labels`; `gh label create` works too).
4. Create the four milestones.
5. Turn on **auto-add to project** for new issues in this repository.
6. Pin `DEPLOYMENT.md` and `docs/test-plan.md` in the repo sidebar — reviewers
   look for those first.

## 8. What the board is not

It is not a status report for the instructor. It is the group's own memory: in
week 11, nobody will remember why the analytics screen was descoped, and the
issue that says so will be the only record. Write issues for the person reading
them three weeks from now, who is you.
