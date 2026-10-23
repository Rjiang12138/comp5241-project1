import Link from "next/link";
import { Shell } from "@/components/Shell";
import { getSession } from "@/lib/auth";
import { audienceLabel, statusLabel, statusPill } from "@/lib/format";
import { cohortsHref } from "@/lib/nav";
import { listCourses } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata = { title: "My courses — Praxis" };

export default async function CoursesPage() {
  const session = await getSession();
  const courses = await listCourses();
  const cohorts = new Set(courses.map((c) => c.cohortId).filter(Boolean)).size;

  return (
    <Shell
      session={session}
      active="courses"
      courseCount={courses.length}
      crumb={
        <>
          <span>My courses</span>
        </>
      }
      actions={
        <>
          <Link className="btn btn-sm" href={cohortsHref(session)}>
            Cohorts
          </Link>
          <Link className="btn btn-primary btn-sm" href="/studio">
            New course
          </Link>
        </>
      }
    >
      <div className="page-head">
        <div>
          <h1>My courses</h1>
          <p>
            {courses.length} courses · {cohorts} cohorts · Semester 1 2026/27
          </p>
        </div>
        <div className="row">
          <Link className="btn btn-sm" href="/insights">
            View insights
          </Link>
        </div>
      </div>

      <div className="course-grid">
        {courses.map((course) => (
          <Link key={course.id} href={`/courses/${course.id}`} className="card course-card">
            <div className="between">
              <span className={statusPill(course.status)}>{statusLabel(course.status)}</span>
              <span className="tiny muted mono">v{course.version}</span>
            </div>

            <div>
              <div className="title">{course.title}</div>
              <div className="tiny muted" style={{ marginTop: "2px" }}>
                {course.code} · {audienceLabel(course.audience)}
              </div>
            </div>

            <div className="brief">{course.brief}</div>

            <div className="meta">
              <span>{course.moduleCount} modules</span>
              <span>·</span>
              <span>{course.activityCount} activities</span>
              <span>·</span>
              <span>{course.minutes} min</span>
            </div>

            <div className="foot">
              <span className="avatar" style={{ width: "22px", height: "22px", fontSize: "9.5px" }}>
                {(course.owner?.name ?? "?")
                  .replace(/^Dr\.\s*/i, "")
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <span className="tiny muted">{course.owner?.name ?? "Unassigned"}</span>
              <span className="tiny muted" style={{ marginLeft: "auto" }}>
                Open editor
              </span>
            </div>
          </Link>
        ))}
      </div>
    </Shell>
  );
}
