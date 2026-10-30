import { getCourse, learnerProgress } from "@/lib/store";

/**
 * GET /courses/[id]/export
 *
 * The roster file the course editor offers, built from the same query the cohort
 * table renders. One row per enrolled learner, with the columns an instructor
 * would paste into a spreadsheet to chase people.
 */

function escape(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await context.params;
  const course = await getCourse(id);
  if (!course) return new Response("Unknown course", { status: 404 });

  const rows = await learnerProgress(course.id);

  const lines: string[] = [];
  lines.push(["course", "course_id", "learner", "email", "background", "completed", "total", "progress_pct", "minutes_done", "last_active", "status"].join(","));
  for (const row of rows) {
    lines.push(
      [
        escape(course.title),
        course.id,
        escape(row.name),
        row.email,
        row.background,
        row.completed,
        row.total,
        row.total === 0 ? 0 : Math.round((row.completed / row.total) * 100),
        row.minutesDone,
        row.lastActive ? row.lastActive.toISOString().slice(0, 10) : "never",
        escape(row.signal),
      ].join(","),
    );
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="praxis-roster-${course.id}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
