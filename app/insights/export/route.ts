import { getSession } from "@/lib/auth";
import { courseAnalytics, getCourse } from "@/lib/store";

/**
 * GET /insights/export?course=c-sef&range=7
 *
 * A real file, built from the same query the screen uses. The alternative —
 * a button that opens a print dialog — is the kind of thing that looks finished
 * in a demo and fails the first time someone needs the data in a spreadsheet.
 */

function escape(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(request: Request): Promise<Response> {
  const session = await getSession();
  // A route handler has no page to redirect from, so this is a 403 rather than
  // the redirect requireStaff() performs.
  if (session.role === "learner") return new Response("Forbidden", { status: 403 });

  const url = new URL(request.url);
  const courseId = url.searchParams.get("course") ?? "";
  const raw = url.searchParams.get("range") ?? "all";
  const rangeDays = raw === "7" ? 7 : raw === "30" ? 30 : null;

  const course = courseId ? await getCourse(courseId) : null;
  if (!course) return new Response("Unknown course", { status: 404 });

  const analytics = await courseAnalytics(course.id, rangeDays);

  const lines: string[] = [];
  lines.push(["metric", "value"].join(","));
  lines.push(["course", escape(course.title)].join(","));
  lines.push(["course_id", course.id].join(","));
  lines.push(["range_days", rangeDays ?? "all"].join(","));
  lines.push(["learners", analytics.learners].join(","));
  lines.push(["active_this_week_pct", analytics.activeThisWeek].join(","));
  lines.push(["average_progress_pct", analytics.averageProgress].join(","));
  lines.push(["completion_pct", analytics.completionRate].join(","));
  lines.push(["finished_all", analytics.finishedAll].join(","));
  lines.push(["median_attempts", analytics.medianAttempts].join(","));
  lines.push(["tutor_questions", analytics.tutorQuestions].join(","));
  lines.push("");

  lines.push(["week", "engagement_pct"].join(","));
  for (const point of analytics.weekly) lines.push([point.label, point.value].join(","));
  lines.push("");

  lines.push(["format", "completion_pct", "attempts"].join(","));
  for (const row of analytics.byFormat) lines.push([row.label, row.pct, row.attempts].join(","));
  lines.push("");

  lines.push(["learner", "background", "completed", "total", "signal", "last_active"].join(","));
  for (const row of analytics.nudge) {
    lines.push(
      [
        escape(row.name),
        row.background,
        row.completed,
        row.total,
        escape(row.signal),
        row.lastActive ? row.lastActive.toISOString().slice(0, 10) : "never",
      ].join(","),
    );
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="praxis-insights-${course.id}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
