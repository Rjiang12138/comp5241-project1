import PathBuilder from "@/components/PathBuilder";
import { requireUser } from "@/lib/auth";
import { getLatestPath, learnerCourseProgress, pathLibrary } from "@/lib/store";
import {
  clearPathAction,
  completeStepAction,
  designPathAction,
  reopenStepAction,
  startStepAction,
  swapStepAction,
} from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Learning path — Praxis" };

/** "Design my path" asks a model to sequence the library; same ceiling as /studio. */
export const maxDuration = 60;

type Search = { generated?: string; error?: string };

const DOMAIN_LABEL: Record<string, string> = {
  backend: "Backend",
  data: "Data",
  product: "Product",
  design: "Design",
};

export default async function PathPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const session = await requireUser("/path");
  const [path, library, progress] = await Promise.all([
    getLatestPath(session.userId),
    pathLibrary(),
    learnerCourseProgress(session.userId),
  ]);

  /**
   * A step is done when its flag says so, or when the event log says every
   * activity in the course behind it is finished. The second half is the fix
   * for a real complaint: a learner completed all seven activities of the
   * course on step 1 and the path still drew "you are here · 40%", because the
   * percentage was a constant carried over from the prototype.
   */
  const percentOf = (step: { status: string; courseId: string | null }): number => {
    if (step.status === "done") return 100;
    const row = step.courseId ? progress[step.courseId] : undefined;
    if (!row || row.total === 0) return 0;
    return Math.round((row.completed / row.total) * 100);
  };

  const doneCount = path ? path.steps.filter((step) => percentOf(step) === 100).length : 0;
  const gaps = path ? path.steps.filter((step) => !step.courseId).length : 0;
  const nowIndex = path ? path.steps.findIndex((step) => percentOf(step) < 100) : -1;

  // Generating a course is an instructor action. A learner who presses it is
  // sent to the sign-in page with the reason, rather than bounced to /learn —
  // which is what the role guard used to do, silently, making the button look
  // broken.
  const generateHref = session.role === "learner" ? "/login?next=%2Fstudio&need=staff" : "/studio";

  // Swap can only offer a course this path has not used yet. When every
  // published course is already in the path the button has nothing to give, and
  // a control that does nothing when pressed is the thing this build is trying
  // to stop doing.
  const usedIds = new Set((path?.steps ?? []).map((step) => step.courseId).filter(Boolean) as string[]);
  const canSwap = library.some((course) => !usedIds.has(course.id));

  return (
    <>
      <div className="player-top">
        <a className="exit" href="/" title="Home">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M15 5l-7 7 7 7" /></svg>
        </a>
        <div>
          <div className="player-title">My learning</div>
          <div className="player-sub">Self-directed path · {session.name}</div>
        </div>
        <div style={{ marginLeft: "auto" }} className="row">
          <a className="btn btn-sm" href="/learn">My courses</a>
          {session.role === "learner" ? null : (
            <a className="btn btn-sm" href="/courses">Instructor view</a>
          )}
          <span className="avatar">{session.initials}</span>
        </div>
      </div>

      <div className="page" style={{ maxWidth: "1260px", margin: "0 auto" }}>
        <div className="page-head">
          <div>
            <h1 style={{ fontSize: "24px" }}>Build a path, not a playlist</h1>
            <p>Tell Praxis where you want to be. It sequences existing mini-courses and marks the ones it would have to generate.</p>
          </div>
          <span className="pill pill-teal">{library.length} courses in the library</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "348px minmax(0,1fr)", gap: "18px", alignItems: "start" }}>
          <div className="stack">
            <PathBuilder
              action={designPathAction}
              defaultGoal={path?.goal}
              error={params.error === "goal" ? "Say a little more about the outcome — twelve characters is the minimum." : undefined}
            />

            <div className="card card-pad">
              <div className="eyebrow">Already in the library</div>
              <div className="stack mt-12" style={{ gap: "9px" }}>
                {library.length === 0 ? (
                  <div className="tiny muted">Nothing is published yet.</div>
                ) : (
                  library.map((course) => (
                    <div className="between" style={{ fontSize: "12.5px" }} key={course.id}>
                      <span>{course.title}</span>
                      <span className="tiny muted">{course.minutes} min</span>
                    </div>
                  ))
                )}
              </div>
              <div className="footnote">
                A step with no course behind it is a gap, not a placeholder: the library genuinely cannot fill it, and
                the path says so instead of linking somewhere useless.
              </div>
            </div>
          </div>

          {path ? (
            <div className="card">
              <div className="card-head">
                <div>
                  <h3>
                    {DOMAIN_LABEL[path.domain] ?? path.domain} · {path.weeks}-week path
                  </h3>
                  <div className="tiny muted" style={{ marginTop: "2px" }}>
                    {path.steps.length} steps · {path.hoursPerWeek} h / week · {path.level}, {path.steps.filter((step) => step.courseId).length} from the library
                    {gaps > 0 ? ` · ${gaps} would need generating` : ""}
                  </div>
                </div>
                <div className="row">
                  <span className={path.model === "template-v1" ? "pill pill-line" : "pill pill-brand"}>
                    {path.model === "template-v1" ? "Sequenced by rule" : "AI-sequenced"}
                  </span>
                  <form action={clearPathAction}>
                    <button className="btn btn-sm" type="submit">Start over</button>
                  </form>
                </div>
              </div>

              <div className="card-body">
                <div className="timeline">
                  {path.steps.map((step, index) => {
                    const percent = percentOf(step);
                    const finished = percent === 100;
                    const status = finished ? "done" : index === nowIndex ? "now" : "";
                    const row = step.courseId ? progress[step.courseId] : undefined;
                    return (
                      <div className={`tl-item ${status}`} key={step.id}>
                        <div className="between" style={{ alignItems: "flex-start" }}>
                          <div>
                            <div className="row" style={{ gap: "8px" }}>
                              <b style={{ fontSize: "13.6px" }}>{step.title}</b>
                              <span className={finished ? "pill pill-teal" : index === nowIndex ? "pill pill-brand" : "pill"}>
                                {finished ? "done" : index === nowIndex ? "you are here" : "not started"}
                              </span>
                              {!step.courseId ? <span className="pill pill-amber">gap</span> : null}
                            </div>
                            <div className="tiny muted" style={{ marginTop: "3px" }}>
                              {Math.round(step.minutes / 60 * 10) / 10} h · {step.detail}
                              {row && row.total > 0 ? ` · ${row.completed} of ${row.total} activities done` : ""}
                            </div>
                          </div>
                          <span className="tiny muted">{percent}%</span>
                        </div>

                        <div className="row mt-8" style={{ gap: "8px", flexWrap: "wrap" }}>
                          {step.courseTitle ? <span className="pill pill-line">{step.courseTitle}</span> : null}

                          {step.courseId ? (
                            <form action={startStepAction}>
                              <input type="hidden" name="courseId" value={step.courseId} />
                              <button className="btn btn-sm btn-primary" type="submit">
                                {finished ? "Replay" : percent > 0 ? "Continue" : "Start"}
                              </button>
                            </form>
                          ) : (
                            <a className="btn btn-sm" href={generateHref}>
                              Generate this course
                            </a>
                          )}

                          <form action={swapStepAction}>
                            <input type="hidden" name="stepId" value={step.id} />
                            <button
                              className="btn btn-sm btn-ghost"
                              type="submit"
                              disabled={!canSwap}
                              title={canSwap ? "Replace with the best unused course in the library" : "Every published course is already in this path — generate another one to swap it in"}
                            >
                              Swap
                            </button>
                          </form>

                          {/*
                            A step with a course behind it is finished by the event
                            log, not by a tick: offering "Mark done" there let the
                            flag and the evidence disagree, and "Reopen" could not
                            un-finish an activity the learner had actually done.
                            The manual tick stays for gap steps, where there is no
                            course to produce evidence.
                          */}
                          {step.courseId ? null : (
                            <form action={step.status === "done" ? reopenStepAction : completeStepAction}>
                              <input type="hidden" name="stepId" value={step.id} />
                              <button className="btn btn-sm btn-ghost" type="submit">
                                {step.status === "done" ? "Reopen" : "Mark done"}
                              </button>
                            </form>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="card-body" style={{ borderTop: "1px solid var(--line-2)", background: "#fbfbfd", borderRadius: "0 0 12px 12px" }}>
                <div className="between">
                  <div className="row tiny muted" style={{ maxWidth: "560px", lineHeight: "1.5" }}>
                    <span style={{ color: "#4338ca" }}>◈</span>
                    {path.model === "template-v1"
                      ? "Why this order: the steps run shortest first, so the first week cannot fail. Each one assumes the evidence the previous one produced — you cannot review a diff before you have shipped one."
                      : `Why this order: ${path.model} sequenced the weeks against your goal, your level and the hours you can give it. Each step assumes the evidence the previous one produced — you cannot review a diff before you have shipped one.`}
                  </div>
                  <div className="row">
                    <span className="tiny muted" style={{ whiteSpace: "nowrap" }}>{doneCount} of {path.steps.length} done</span>
                    <span className="pill pill-line">{params.generated ? "just generated" : `model: ${path.model}`}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-head">
                <div>
                  <h3>No path yet</h3>
                  <div className="tiny muted" style={{ marginTop: "2px" }}>
                    Describe the goal on the left and press Design my path.
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="tiny muted" style={{ lineHeight: 1.7, maxWidth: "620px" }}>
                  The builder scores every published course against your goal, drops the ones that do not fit, and
                  orders what is left from shortest to longest. When nothing in the library fits a week, it says so
                  instead of linking you to a course that will waste the week.
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card card-pad mt-16" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: "#ecfdf5", color: "#0f766e", display: "grid", placeItems: "center" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M4 6h16M4 12h10M4 18h7" /></svg>
          </div>
          <div style={{ flex: "1" }}>
            <div style={{ fontSize: "13px", fontWeight: "600" }}>Need a subject Praxis has never taught?</div>
            <div className="tiny muted" style={{ marginTop: "2px" }}>
              {session.role === "learner"
                ? "Courses are written in the studio, which needs an instructor account. Sign in as staff and the course you generate appears here for everyone."
                : "Upload your own material in the studio and the course becomes available here for everyone."}
            </div>
          </div>
          <a className="btn btn-sm" href={generateHref}>Generate a new course</a>
        </div>
      </div>
    </>
  );
}
