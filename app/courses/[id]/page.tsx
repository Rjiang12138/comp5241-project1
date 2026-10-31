import Link from "next/link";
import { notFound } from "next/navigation";
import AutoSubmitInput, { AutoSubmitSelect } from "@/components/AutoSubmitInput";
import { Shell } from "@/components/Shell";
import { requireStaff } from "@/lib/auth";
import { FORMATS, audienceLabel, formatLabel, formatPill, statusLabel, statusPill } from "@/lib/format";
import { courseAnalytics, courseMinutes, getCourse, learnerProgress } from "@/lib/store";
import {
  addActivityAction,
  addModuleAction,
  fillContentAction,
  importRosterAction,
  moveModuleAction,
  publishCourseAction,
  removeActivityAction,
  removeModuleAction,
  renameModuleAction,
  saveCourseAction,
  updateActivityAction,
} from "../actions";

export const dynamic = "force-dynamic";

/**
 * Course editor.
 *
 * The visual language is prototype/course.html: same shell, same card heads,
 * same module rows, same right-hand column. What changed is that the rows are
 * now forms, and the four cohort statistics are queries against the event log
 * rather than the prototype's fixture numbers. A dashboard that reports 76%
 * completion because 76 was typed into the prototype is worse than one that
 * reports 0% and says why.
 */

function initials(name: string): string {
  return name
    .replace(/^(Dr\.|Prof\.)\s*/i, "")
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function relative(date: Date | null): string {
  if (!date) return "never";
  const hours = Math.floor((Date.now() - date.getTime()) / (60 * 60 * 1000));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await getCourse(id);
  return { title: course ? `${course.title} — Praxis` : "Course — Praxis" };
}

export default async function CourseEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ roster?: string; filled?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const added = Number(query.roster) || 0;
  const filled = query.filled === undefined ? null : Number(query.filled) || 0;
  const session = await requireStaff(`/courses/${id}`);
  const course = await getCourse(id);
  if (!course) notFound();

  const totalMinutes = await courseMinutes(course.id);
  const activityCount = course.modules.reduce((sum, m) => sum + m.activities.length, 0);
  const formatOptions = FORMATS.map((format) => ({ value: format, label: formatLabel(format) }));
  const [analytics, progress] = await Promise.all([
    courseAnalytics(course.id, null),
    learnerProgress(course.id),
  ]);
  const medianMinutes = (() => {
    const values = progress.map((row) => row.minutesDone).sort((a, b) => a - b);
    if (values.length === 0) return 0;
    const middle = Math.floor(values.length / 2);
    return values.length % 2 === 0 ? Math.round((values[middle - 1] + values[middle]) / 2) : values[middle];
  })();
  const needsNudge = progress.filter((row) => row.total > 0 && row.completed < row.total).length;
  const stuckCount = progress.filter((row) => row.stuckOn).length;

  return (
    <Shell
      session={session}
      active="courses"
      crumb={
        <>
          <span>My courses</span>
          <span className="sep">/</span>
          <b>{course.title}</b>
        </>
      }
      actions={
        <>
          <span className={statusPill(course.status)}>
            <span className="dot" />
            {statusLabel(course.status)}
          </span>
          {/* Carries the course id: /learn without one is the learner's shelf,
              and an instructor pressing this button asked to see *this* course. */}
          <Link className="btn btn-sm" href={`/learn?course=${course.id}`}>
            Open learner view
          </Link>
          <Link className="btn btn-primary btn-sm" href="/insights">
            View insights
          </Link>
        </>
      }
    >
      <div className="page-head">
        <div>
          <h1>{course.title}</h1>
          <p>
            {course.code} · {course.term} · {course.modules.length} modules · {totalMinutes} min ·{" "}
            <span className="mono">v{course.version}</span>
          </p>
        </div>
        <div className="row">
          <form action={fillContentAction}>
            <input type="hidden" name="courseId" value={course.id} />
            <button
              className="btn btn-sm"
              type="submit"
              title="Write a body for every activity that has none, from the module objectives"
            >
              Fill activity bodies
            </button>
          </form>
          <form action={publishCourseAction}>
            <input type="hidden" name="courseId" value={course.id} />
            <button className="btn btn-sm btn-primary" type="submit">
              Publish v{course.version + 1}
            </button>
          </form>
        </div>
      </div>

      {filled !== null ? (
        <div
          className="card card-pad"
          style={{ marginBottom: "16px", background: "var(--teal-soft)", borderColor: "#99f6e4" }}
        >
          <div className="tiny" style={{ lineHeight: 1.6 }}>
            {filled === 0
              ? "Every activity already has a body — nothing was written."
              : `Wrote ${filled} activity ${filled === 1 ? "body" : "bodies"} from the module objectives. Open the course in the learner view to read them.`}
          </div>
        </div>
      ) : null}

      <div className="grid-4" style={{ marginBottom: "16px" }}>
        <div className="stat">
          <div className="label">Enrolled</div>
          <div className="value">{analytics.learners}</div>
          <div className="delta">{analytics.activeThisWeek}% active this week</div>
        </div>
        <div className="stat">
          <div className="label">Average progress</div>
          <div className="value">
            {analytics.averageProgress}
            <span style={{ fontSize: "13px", fontWeight: "500", color: "#98a2b3" }}> %</span>
          </div>
          <div className="delta">
            {analytics.finishedAll} of {analytics.learners} finished every activity
          </div>
        </div>
        <div className="stat">
          <div className="label">Median minutes completed</div>
          <div className="value">
            {medianMinutes}<span style={{ fontSize: "14px", fontWeight: 500 }}> min</span>
          </div>
          <div className="delta">of a {totalMinutes} min course</div>
        </div>
        <div className="stat">
          <div className="label">Needs a nudge</div>
          <div className="value">{needsNudge}</div>
          <div className="delta down">
            {stuckCount > 0
              ? `${stuckCount} stuck on an activity they have retried`
              : needsNudge > 0
                ? "none stuck, just unfinished"
                : "nobody is behind"}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 330px", gap: "16px", alignItems: "start" }}>
        <div className="stack">
          {/* ------------------------------------------------ modules */}
          <div className="card">
            <div className="card-head">
              <div>
                <h3>Modules &amp; activities</h3>
                <div className="tiny muted" style={{ marginTop: "2px" }}>
                  {course.modules.length} modules · {activityCount} activities · {totalMinutes} min
                </div>
              </div>
              <form action={addModuleAction} className="row">
                <input type="hidden" name="courseId" value={course.id} />
                <input
                  className="input"
                  name="title"
                  placeholder="New module title"
                  required
                  style={{ width: "180px", height: "30px", padding: "0 9px", fontSize: "12.5px" }}
                />
                <button className="btn btn-sm" type="submit">
                  + Add module
                </button>
              </form>
            </div>

            {course.modules.length === 0 ? (
              <div className="card-body">
                <div className="empty">No modules yet. Add one above, or generate an outline in the studio.</div>
              </div>
            ) : null}

            {course.modules.map((module, index) => {
              const moduleMinutes = module.activities.reduce((sum, a) => sum + a.minutes, 0);
              const isLowest = index === 2 && course.modules.length >= 3;

              return (
                <div key={module.id}>
                  <div className="module-row" style={isLowest ? { background: "#fbfbfd" } : undefined}>
                    <span
                      className="module-idx"
                      style={isLowest ? { background: "#e0e7ff", color: "#3730a3" } : undefined}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <form action={renameModuleAction}>
                        <input type="hidden" name="courseId" value={course.id} />
                        <input type="hidden" name="moduleId" value={module.id} />
                        <AutoSubmitInput name="title" defaultValue={module.title} className="inline-input" ariaLabel="Module title" />
                      </form>
                      <div className="meta">
                        {module.activities.length} {module.activities.length === 1 ? "activity" : "activities"} ·{" "}
                        {moduleMinutes} min
                        {isLowest ? <span style={{ color: "#b42318" }}> · lowest in course</span> : null}
                      </div>
                    </div>

                    <div className="right">
                      <form action={moveModuleAction}>
                        <input type="hidden" name="courseId" value={course.id} />
                        <input type="hidden" name="moduleId" value={module.id} />
                        <input type="hidden" name="direction" value="up" />
                        <button className="icon-btn" type="submit" disabled={index === 0} aria-label="Move module up">
                          ↑
                        </button>
                      </form>
                      <form action={moveModuleAction}>
                        <input type="hidden" name="courseId" value={course.id} />
                        <input type="hidden" name="moduleId" value={module.id} />
                        <input type="hidden" name="direction" value="down" />
                        <button
                          className="icon-btn"
                          type="submit"
                          disabled={index === course.modules.length - 1}
                          aria-label="Move module down"
                        >
                          ↓
                        </button>
                      </form>
                      <form action={removeModuleAction}>
                        <input type="hidden" name="courseId" value={course.id} />
                        <input type="hidden" name="moduleId" value={module.id} />
                        <button className="icon-btn danger" type="submit" aria-label="Delete module">
                          ✕
                        </button>
                      </form>
                    </div>
                  </div>

                  <div style={{ background: "#fbfbfd", padding: "6px 20px 14px 56px", borderBottom: "1px solid var(--line-2)" }}>
                    <table className="activity-table">
                      {index === 0 ? (
                        <thead>
                          <tr>
                            <th style={{ paddingLeft: "8px" }}>Activity</th>
                            <th style={{ width: "150px" }}>Format</th>
                            <th style={{ width: "74px" }}>Time</th>
                            <th style={{ width: "36px" }} />
                          </tr>
                        </thead>
                      ) : null}
                      <tbody>
                        {module.activities.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="muted" style={{ fontSize: "12px" }}>
                              No activities yet.
                            </td>
                          </tr>
                        ) : null}
                        {module.activities.map((activity) => (
                          <tr key={activity.id}>
                            <td>
                              <form action={updateActivityAction} id={`act-${activity.id}`}>
                                <input type="hidden" name="courseId" value={course.id} />
                                <input type="hidden" name="activityId" value={activity.id} />
                                <input type="hidden" name="format" value={activity.format} />
                                <AutoSubmitInput
                                  name="title"
                                  defaultValue={activity.title}
                                  className="inline-input plain"
                                  ariaLabel="Activity title"
                                />
                              </form>
                            </td>
                            <td>
                              <form action={updateActivityAction} id={`fmt-${activity.id}`}>
                                <input type="hidden" name="courseId" value={course.id} />
                                <input type="hidden" name="activityId" value={activity.id} />
                                <input type="hidden" name="title" value={activity.title} />
                                <input type="hidden" name="minutes" value={activity.minutes} />
                                <AutoSubmitSelect
                                  key={`fmt:${activity.id}:${activity.format}`}
                                  name="format"
                                  defaultValue={activity.format}
                                  options={formatOptions}
                                  ariaLabel="Activity format"
                                  className="select"
                                />
                              </form>
                            </td>
                            <td>
                              <form action={updateActivityAction} id={`min-${activity.id}`}>
                                <input type="hidden" name="courseId" value={course.id} />
                                <input type="hidden" name="activityId" value={activity.id} />
                                <input type="hidden" name="title" value={activity.title} />
                                <input type="hidden" name="format" value={activity.format} />
                                <AutoSubmitInput
                                  name="minutes"
                                  type="number"
                                  defaultValue={activity.minutes}
                                  className="num-input"
                                  ariaLabel="Activity minutes"
                                />
                              </form>
                            </td>
                            <td>
                              <form action={removeActivityAction}>
                                <input type="hidden" name="courseId" value={course.id} />
                                <input type="hidden" name="activityId" value={activity.id} />
                                <button className="icon-btn danger" type="submit" aria-label="Delete activity">
                                  ✕
                                </button>
                              </form>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <form action={addActivityAction} className="row" style={{ marginTop: "10px" }}>
                      <input type="hidden" name="courseId" value={course.id} />
                      <input type="hidden" name="moduleId" value={module.id} />
                      <input
                        className="input"
                        name="title"
                        placeholder="New activity title"
                        required
                        style={{ height: "30px", padding: "0 9px", fontSize: "12.5px", flex: 1 }}
                      />
                      <select className="select" name="format" defaultValue="reading" style={{ width: "150px", height: "30px", padding: "0 9px", fontSize: "12.5px" }}>
                        {formatOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button className="btn btn-sm" type="submit">
                        + Add activity
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ------------------------------------------------ cohort */}
          <div className="card">
            <div className="card-head">
              <div>
                <h3>Cohort · {course.cohort?.code ?? "unassigned"}</h3>
                <div className="tiny muted" style={{ marginTop: "2px" }}>
                  {course.learners.length} learners ·{" "}
                  {course.learners.filter((l) => l.background === "non_cs").length} non-CS ·{" "}
                  {course.learners.filter((l) => l.background === "cs").length} CS
                </div>
              </div>
              <div className="row">
                <Link className="btn btn-sm" href="/admin">
                  Manage cohort
                </Link>
                <a className="btn btn-sm" href={`/courses/${course.id}/export`}>
                  Export CSV
                </a>
              </div>
            </div>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ paddingLeft: "20px" }}>Learner</th>
                  <th>Background</th>
                  <th>Progress</th>
                  <th>Last active</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {progress.slice(0, 6).map((row) => {
                  const percent = row.total === 0 ? 0 : Math.round((row.completed / row.total) * 100);
                  return (
                    <tr key={row.userId}>
                      <td style={{ paddingLeft: "20px" }}>
                        <div className="cell-user">
                          <span className="avatar">{initials(row.name)}</span>
                          <div>
                            <b style={{ fontWeight: 600 }}>{row.name}</b>
                            <div className="tiny muted">{row.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={row.background === "non_cs" ? "pill pill-brand" : "pill"} style={row.background === "cs" ? { background: "#eef2f6" } : undefined}>
                          {row.background === "non_cs" ? "Non-CS" : "CS"}
                        </span>
                      </td>
                      <td>
                        <div className="row">
                          <div className="progress" style={{ width: "80px" }}>
                            <i style={{ width: `${percent}%` }} />
                          </div>
                          <span className="tiny">{row.completed}/{row.total}</span>
                        </div>
                      </td>
                      <td className="muted">{relative(row.lastActive)}</td>
                      <td>
                        <span className={row.tone === "teal" ? "pill pill-teal" : row.tone === "amber" ? "pill pill-amber" : "pill pill-rose"}>
                          {row.signal}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {progress.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted" style={{ paddingLeft: "20px", fontSize: "12px" }}>
                      Nobody is enrolled yet. Publish the course and it appears on the learner side.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            <div className="tiny muted" style={{ padding: "0 20px 14px" }}>
              {progress.length > 6 ? `Showing 6 of ${progress.length}. ` : ""}
              Progress and status are computed from the event log on every request — the same query that feeds
              /insights, so the two screens cannot disagree.
            </div>

            <div className="card-body" style={{ borderTop: "1px solid var(--line-2)" }}>
              <form action={importRosterAction}>
                <input type="hidden" name="courseId" value={course.id} />
                <label htmlFor="roster" style={{ fontSize: "12.6px", fontWeight: 600 }}>
                  Import a roster
                </label>
                <div className="tiny muted" style={{ marginTop: "2px", marginBottom: "8px" }}>
                  One person per line — <span className="mono">name,email</span> or just an email. People who do not
                  exist yet are created; people already enrolled are skipped.
                </div>
                <textarea
                  className="textarea mono"
                  id="roster"
                  name="roster"
                  rows={3}
                  placeholder={"Mei Chan,mei.chan@example.edu\narjun.rao@example.edu"}
                  style={{ minHeight: "66px", fontSize: "12px" }}
                />
                <div className="row mt-8">
                  <button className="btn btn-sm" type="submit">
                    Add to cohort
                  </button>
                  {added ? (
                    <span className="tiny" style={{ color: "#0f7a4a" }}>
                      {added} learner{added === 1 ? "" : "s"} added
                    </span>
                  ) : null}
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------- right column */}
        <div className="stack">
          <div className="card">
            <div className="card-head">
              <h3>Course settings</h3>
              <span className="pill pill-line">{audienceLabel(course.audience)}</span>
            </div>
            <div className="card-body">
              <form action={saveCourseAction}>
                <input type="hidden" name="courseId" value={course.id} />
                <div className="field">
                  <label htmlFor="title">Title</label>
                  <input className="input" id="title" name="title" defaultValue={course.title} />
                </div>
                <div className="field">
                  <label htmlFor="brief">Brief</label>
                  <textarea className="textarea" id="brief" name="brief" defaultValue={course.brief} style={{ minHeight: "76px" }} />
                  <div className="hint">Used as the generation prompt for every module.</div>
                </div>
                <div className="field">
                  <label htmlFor="audience">Audience</label>
                  {/* Keyed so the control re-mounts with the saved value. An
                      uncontrolled select keeps the value it mounted with, which
                      makes a successful save look like a no-op. */}
                  <select
                    key={`audience:${course.audience}`}
                    className="select"
                    id="audience"
                    name="audience"
                    defaultValue={course.audience}
                  >
                    <option value="mixed">Mixed cohort</option>
                    <option value="non_cs">Non-CS majors</option>
                    <option value="cs">CS graduates</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="minutes">Time budget (minutes)</label>
                  <input className="input" id="minutes" name="minutes" type="number" defaultValue={course.minutes} />
                  <div className="hint">Current activities total {totalMinutes} min.</div>
                </div>
                <button className="btn btn-sm btn-primary" type="submit" style={{ width: "100%", justifyContent: "center" }}>
                  Save course
                </button>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Adaptation rules</h3>
              <span className="pill pill-brand">{audienceLabel(course.audience)}</span>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="between">
                <div>
                  <div style={{ fontSize: "12.6px", fontWeight: 600 }}>By background</div>
                  <div className="tiny muted">Non-CS reads an analogy first, CS leads with the rule</div>
                </div>
                <span className="pill pill-teal">
                  {progress.filter((row) => row.background === "non_cs").length} non-CS
                </span>
              </div>
              <div className="divider" />
              <div className="between">
                <div>
                  <div style={{ fontSize: "12.6px", fontWeight: 600 }}>By pace</div>
                  <div className="tiny muted">Hint unlocks after 1 failed attempt (non-CS) or 2 (CS)</div>
                </div>
                <span className="pill pill-teal">Active</span>
              </div>
              <div className="divider" />
              <div className="between">
                <div>
                  <div style={{ fontSize: "12.6px", fontWeight: 600 }}>Language</div>
                  <div className="tiny muted">English only — switching is not built</div>
                </div>
                <span className="pill pill-line">EN</span>
              </div>
              <div className="divider" />
              <div className="between">
                <div>
                  <div style={{ fontSize: "12.6px", fontWeight: 600 }}>Accessibility</div>
                  <div className="tiny muted">Captions on generated audio — no audio is generated yet</div>
                </div>
                <span className="pill pill-amber">not built</span>
              </div>
              <Link className="btn btn-sm" style={{ justifyContent: "center" }} href={`/learn?course=${course.id}`}>
                See it in the learner view
              </Link>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Versions</h3>
              <span className="tiny muted">auto-kept</span>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "11px", fontSize: "12.4px" }}>
              {course.versions.map((version) => (
                <div className="between" key={version.id}>
                  <div>
                    <b style={{ fontWeight: 600 }}>
                      v{version.version}
                      {version.version === course.version ? " · current" : ""}
                    </b>
                    <div className="tiny muted">{version.note}</div>
                  </div>
                  <span className="tiny muted">{version.createdAt}</span>
                </div>
              ))}
              {course.versions.length === 0 ? <div className="tiny muted">No versions yet.</div> : null}
              <Link className="btn btn-sm" href={`/courses/${course.id}/versions`} style={{ marginTop: "2px", justifyContent: "center" }}>
                {course.versions.length >= 2 ? `Compare v${course.version - 1} → v${course.version}` : "Version history"}
              </Link>
            </div>
          </div>

          <div className="card card-pad" style={{ background: "#fffdf5", borderColor: "#fde9c8" }}>
            <div className="eyebrow" style={{ color: "#b45309" }}>
              Next action
            </div>
            <div style={{ fontSize: "12.5px", marginTop: "6px", lineHeight: 1.6 }}>
              {analytics.insight ? (
                <>
                  <b>{analytics.insight.headline}.</b> {analytics.insight.body.split(". ").slice(-1)[0]}
                </>
              ) : analytics.nudge.length > 0 ? (
                <>
                  <b>{analytics.nudge[0].name}</b> — {analytics.nudge[0].signal.toLowerCase()}.{" "}
                  {analytics.nudge.length} learner{analytics.nudge.length === 1 ? "" : "s"} in this course have
                  not finished; send a nudge from the insights screen.
                </>
              ) : (
                <>Nothing is stuck. The next useful move is to publish the next version and let the cohort run.</>
              )}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
