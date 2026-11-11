import Link from "next/link";
import { Shell } from "@/components/Shell";
import { requireStaff } from "@/lib/auth";
import { audienceLabel, statusLabel, statusPill } from "@/lib/format";
import { cohortsHref } from "@/lib/nav";
import { listCourses } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata = { title: "My courses — Praxis" };

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const { denied } = await searchParams;
  const session = await requireStaff("/courses");
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

      {denied === "owner" ? (
        <div className="card card-pad" role="alert" style={{ marginBottom: "16px" }}>
          That course belongs to another instructor. The listing stays visible so the team can
          see each other&apos;s work; only its owner and the admin can open the editor.
        </div>
      ) : null}

      <div className="course-grid">
        {courses.map((course) => {
          // "My courses" is the team's catalogue, not a personal shelf: everyone
          // sees every course, because a colleague's structure is the reference
          // you copy. Editing is the part that stays with the owner.
          const canEdit = session.role === "admin" || course.ownerId === session.userId;
          const body = (
            <>
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
                  {canEdit ? "Open editor" : "Read only"}
                </span>
              </div>
            </>
          );

          return canEdit ? (
            <Link key={course.id} href={`/courses/${course.id}`} className="card course-card">
              {body}
            </Link>
          ) : (
            <div key={course.id} className="card course-card" style={{ cursor: "default" }}>
              {body}
            </div>
          );
        })}
      </div>
    </Shell>
  );
}
