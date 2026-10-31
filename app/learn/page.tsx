import { cookies } from "next/headers";
import LearnPlayer from "@/components/LearnPlayer";
import { requireUser } from "@/lib/auth";
import { PREVIEW_COOKIE, getLatestPath, getLearnerView, learnerCourseProgress, listPublishedCourses, previewLearner, recordStart } from "@/lib/store";
import { contentFor, FORMAT_LABEL } from "@/lib/activity-content";
import { cyclePreviewAction, enrollAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Learn — Praxis" };

type Search = { course?: string; activity?: string };


export default async function LearnPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const session = await requireUser("/learn");
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
  const finishedAll = flat.every((row) => view.completed.includes(row.activity.id));

  // Opening a course you have already finished used to resume on its last
  // activity, whose only button read "Completed" and was disabled — a dead end
  // that looks like a bug because it is one. When there is nothing left to do,
  // the page says so and offers the next thing.
  if (!requested && finishedAll) {
    return (
      <CourseComplete
        courseId={view.course.id}
        courseTitle={view.course.title}
        learnerName={view.learner.name}
        preview={preview}
        activities={flat.length}
        minutes={flat.reduce((sum, row) => sum + row.activity.minutes, 0)}
        firstActivityId={flat[0].activity.id}
        exitHref={preview ? `/courses/${view.course.id}` : "/path"}
        learnerId={view.learner.id}
        otherCourses={view.courses.filter((row) => row.id !== view.course.id)}
      />
    );
  }

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
      exitHref={preview ? `/courses/${view.course.id}` : "/path"}
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

/** Shown when the learner has no enrolment — a real state, not an error. */async function EmptyState({ learnerName, preview }: { learnerName: string; preview: boolean }) {
  const courses = await listPublishedCourses();

  return (
    <>
      <div className="player-top">
        <a className="exit" href={preview ? "/courses" : "/path"} title="Back">
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

/**
 * The page a finished course opens on.
 *
 * The alternative — resuming on the last activity — put the learner in front of
 * a disabled button labelled "Completed" with nothing after it. A course that is
 * over should say so and point at the next thing: the next unfinished step in
 * the path, then the other courses they are enrolled in, then the path builder.
 */
async function CourseComplete({
  courseId,
  courseTitle,
  learnerName,
  preview,
  activities,
  minutes,
  firstActivityId,
  exitHref,
  learnerId,
  otherCourses,
}: {
  courseId: string;
  courseTitle: string;
  learnerName: string;
  preview: boolean;
  activities: number;
  minutes: number;
  firstActivityId: string;
  exitHref: string;
  learnerId: string;
  otherCourses: Array<{ id: string; title: string; minutes: number }>;
}) {
  const [path, progress] = await Promise.all([getLatestPath(learnerId), learnerCourseProgress(learnerId)]);

  const nextStep = path?.steps.find((step) => {
    if (!step.courseId || step.courseId === courseId) return false;
    const row = progress[step.courseId];
    return !row || row.total === 0 || row.completed < row.total;
  });

  // When the path has nothing left to point at, the library still might. An
  // instructor previewing does not get this card: enrolling from a preview
  // would enrol the instructor, which is not what the button says.
  const enrolled = new Set([courseId, ...otherCourses.map((course) => course.id)]);
  const library = preview
    ? []
    : (await listPublishedCourses()).filter((course) => !enrolled.has(course.id)).slice(0, 3);

  return (
    <>
      <div className="player-top">
        <a className="exit" href={exitHref} title="Back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M15 5l-7 7 7 7" /></svg>
        </a>
        <div>
          <div className="player-title">{courseTitle}</div>
          <div className="player-sub">Course complete · {activities} activities · {minutes} min</div>
        </div>
        <div style={{ marginLeft: "auto" }} className="row">
          <span className="pill pill-line">
            <span className="dot" style={{ background: preview ? "#f79009" : "#12b76a" }}></span>
            {preview ? `Previewing as ${learnerName}` : "Autosaved"}
          </span>
          <a className="btn btn-sm" href="/path">My path</a>
        </div>
      </div>

      <div className="page" style={{ maxWidth: "760px", margin: "0 auto" }}>
        <div className="card card-pad">
          <div className="eyebrow">Finished</div>
          <h1 style={{ fontSize: "22px", marginTop: "6px" }}>You finished {courseTitle}</h1>
          <p className="muted mt-8" style={{ fontSize: "13px", lineHeight: 1.7, maxWidth: "600px" }}>
            {activities} activities · {minutes} minutes, all recorded in the event log. There is nothing left in this
            course — here is what comes next.
          </p>

          <div className="row mt-16" style={{ flexWrap: "wrap" }}>
            {nextStep?.courseId ? (
              <a className="btn btn-sm btn-primary" href={`/learn?course=${nextStep.courseId}`}>
                Next: {nextStep.title} →
              </a>
            ) : (
              <a className="btn btn-sm btn-primary" href="/path">
                Back to my path
              </a>
            )}
            <a className="btn btn-sm" href={`/learn?course=${courseId}&activity=${firstActivityId}`}>
              Replay from the start
            </a>
          </div>

          {nextStep?.courseId ? (
            <div className="tiny muted mt-12" style={{ lineHeight: 1.6 }}>
              Taken from your path: {nextStep.title}, {Math.round((nextStep.minutes / 60) * 10) / 10} h.
            </div>
          ) : (
            <div className="tiny muted mt-12" style={{ lineHeight: 1.6 }}>
              No further step in your path points at a published course. Build a longer path, or ask an instructor to
              generate the missing one.
            </div>
          )}
        </div>

        {otherCourses.length > 0 ? (
          <div className="card mt-16">
            <div className="card-head">
              <h3>Also enrolled</h3>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {otherCourses.map((course) => (
                <div className="between" key={course.id}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600 }}>{course.title}</div>
                    <div className="tiny muted">{course.minutes} min</div>
                  </div>
                  <a className="btn btn-sm" href={`/learn?course=${course.id}`}>
                    Open
                  </a>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {library.length > 0 ? (
          <div className="card mt-16">
            <div className="card-head">
              <h3>More in the library</h3>
              <span className="tiny muted">published, open to enrol</span>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {library.map((course) => (
                <div className="between" key={course.id}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600 }}>{course.title}</div>
                    <div className="tiny muted">
                      {course.modules} modules · {course.minutes} min
                    </div>
                  </div>
                  <form action={enrollAction}>
                    <input type="hidden" name="courseId" value={course.id} />
                    <button className="btn btn-sm" type="submit">
                      Start
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
