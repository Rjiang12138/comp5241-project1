# Interpreting course insights

The activity-type completion chart counts completed learner-activity pairs divided
by all possible pairs for enrolled learners, including learners who have not
started. It describes current all-time progress; the 7-day and 30-day filters
apply to attempts and tutor questions, not to accumulated completions. The weekly
engagement chart always shows the past eight weeks.

To avoid ranking formats on a tiny sample, the comparison is withheld until five
distinct enrolled learners have completed at least one current course activity.
Five is a display threshold, not a claim of statistical significance. When a
comparison appears, it includes counts and does not infer a cause. Course order,
learner feedback and other context still need review.

CSV exports include the same all-time completion numerator and denominator, and
attempts for the chosen time range. Run `npm run test:analytics` for the analytics
regression tests.
