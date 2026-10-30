import { cookies } from "next/headers";
import LearnPlayer from "@/components/LearnPlayer";
import { getSession } from "@/lib/auth";
import { PREVIEW_COOKIE, getLearnerView, listPublishedCourses, previewLearner, recordStart } from "@/lib/store";
import { contentFor, FORMAT_LABEL } from "@/lib/activity-content";
import { cyclePreviewAction, enrollAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Learn — Praxis" };

type Search = { course?: string; activity?: string };


export default async function LearnPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const session = await getSession();
  const preview = session.role !== "learner";

  // An instructor previewing runs the course as a real learner, so progress and
  // events are written to a real enrolment. Pretending otherwise would make the
  // preview a screenshot.
  const jar = await cookies();
  const pinned = preview ? jar.get(PREVIEW_COOKIE)?.value : undefined;
  const learnerId = preview ? await previewLearner(params.course, pinned) : session.userId;

  if (!learnerId) return <EmptyState learnerName={session.name} preview={preview} />;

  const view = await getLearnerView(learnerId, params.course);
  if (!view) return <EmptyState learnerName={session.name} preview={preview} />;

  const flat = view.course.modules.flatMap((module) =>
    module.activities.map((activity, index) => ({
      activity,
      module,
      indexInModule: index + 1,
      moduleActivityCount: module.activities.length,
    })),
  );

  if (flat.length === 0) return <EmptyState learnerName={view.learner.name} preview={preview} />;

  const requested = params.activity ? flat.find((row) => row.activity.id === params.activity) : undefined;
  const current = requested ?? flat.find((row) => row.activity.id === view.currentActivityId) ?? flat[0];
  const position = flat.findIndex((row) => row.activity.id === current.activity.id);

  const content = contentFor(
    {
      id: current.activity.id,
      title: current.activity.title,
      format: current.activity.format,
      payload: current.activity.payload,
    },
    { title: current.module.title, objective: current.module.objective },
    { title: view.course.title, brief: view.course.brief },
  );

  const completedMinutes = flat
    .filter((row) => view.completed.includes(row.activity.id))
    .reduce((sum, row) => sum + row.activity.minutes, 0);

  // Opening an activity is an event. Without it the analytics screen can count
  // completions but cannot answer "how many people opened this and walked away",
  // which is the only question a teacher actually asks about a hard activity.
  if (!view.completed.includes(current.activity.id)) {
    await recordStart(view.enrollmentId, current.activity.id);
  }

  return (
    <LearnPlayer
      courseId={view.course.id}
      courseTitle={view.course.title}
      enrollmentId={view.enrollmentId}
      learnerName={view.learner.name}
      learnerBackground={view.learner.background}
      preview={preview}
      cyclePreview={preview ? cyclePreviewAction : undefined}
      activity={{
        id: current.activity.id,
        title: current.activity.title,
        format: current.activity.format,
        minutes: current.activity.minutes,
        moduleId: current.module.id,
        moduleTitle: current.module.title,
        moduleObjective: current.module.objective,
        modulePosition: current.module.position,
        indexInModule: current.indexInModule,
        moduleActivityCount: current.moduleActivityCount,
      }}
      content={content}
      modules={view.course.modules.map((module) => ({
        id: module.id,
        title: module.title,
        activities: module.activities.map((activity) => ({ id: activity.id, title: activity.title })),
      }))}
      completed={view.completed}
      attempts={view.attempts}
      prevId={position > 0 ? flat[position - 1].activity.id : null}
      nextId={position < flat.length - 1 ? flat[position + 1].activity.id : null}
      totalActivities={flat.length}
      totalMinutes={flat.reduce((sum, row) => sum + row.activity.minutes, 0)}
      completedMinutes={completedMinutes}
    />
  );
}

/** Shown when the learner has no enrolment — a real state, not an error. */
async function EmptyState({ learnerName, preview }: { learnerName: string; preview: boolean }) {
  const courses = await listPublishedCourses();

  return (
    <>
      <div className="player-top">
        <a className="exit" href="/courses" title="Back to courses">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M15 5l-7 7 7 7" /></svg>
        </a>
        <div>
          <div className="player-title">Nothing to play yet</div>
          <div className="player-sub">No enrolment found</div>
        </div>
        <div style={{ marginLeft: "auto" }} className="row">
          <span className="pill pill-line">{preview ? `Previewing as ${learnerName}` : learnerName}</span>
          <a className="btn btn-sm" href="/path">My path</a>
        </div>
      </div>

      <div className="page" style={{ maxWidth: "760px" }}>
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Join a course</h3>
              <div className="tiny muted" style={{ marginTop: "2px" }}>
                These are published and open. Enrolling creates the row that progress hangs off.
              </div>
            </div>
          </div>
          <div className="card-body">
            {courses.length === 0 ? (
              <div className="tiny muted">No course is published yet. Publish one from the editor first.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {courses.map((course) => (
                  <div className="between" key={course.id}>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600 }}>{course.title}</div>
                      <div className="tiny muted">{course.modules} modules · {course.minutes} min</div>
                    </div>
                    <form action={enrollAction}>
                      <input type="hidden" name="courseId" value={course.id} />
                      <button className="btn btn-sm btn-primary" type="submit">
                        Enrol
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card-body" style={{ borderTop: "1px solid var(--line-2)", paddingTop: "12px" }}>
            <div className="tiny muted">
              Formats available in the player: {Object.values(FORMAT_LABEL).slice(0, 6).join(" · ")}. Mini-games and
              narrated slides are modelled but not built — the player says so rather than showing an empty card.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
