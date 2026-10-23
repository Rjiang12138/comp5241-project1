import Link from "next/link";
import { notFound } from "next/navigation";
import AutoSubmitInput, { AutoSubmitSelect } from "@/components/AutoSubmitInput";
import { Shell } from "@/components/Shell";
import { getSession } from "@/lib/auth";
import { FORMATS, audienceLabel, formatLabel, formatPill, statusLabel, statusPill } from "@/lib/format";
import { courseMinutes, getCourse } from "@/lib/store";
import {
  addActivityAction,
  addModuleAction,
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
 * now forms. The prototype's four cohort statistics are kept as they were —
 * they are prototype fixtures until the `events` table is written to (see
 * docs/ai-usage-log.md, rule 7: no invented numbers about our users).
 */

/** Fixture values from the mid-term prototype, keyed by learner. */
const LEARNER_FIXTURE: Record<string, { progress: string; done: string; lastActive: string; status: string; pill: string; avatar: string }> = {
  "u-mei": { progress: "100%", done: "5/5", lastActive: "2 hours ago", status: "On track", pill: "pill pill-teal", avatar: "t" },
  "u-arjun": { progress: "60%", done: "3/5", lastActive: "Yesterday", status: "Stalled 2d", pill: "pill pill-amber", avatar: "" },
  "u-sara": { progress: "40%", done: "2/5", lastActive: "3 days ago", status: "At risk", pill: "pill pill-rose", avatar: "rose" },
  "u-tom": { progress: "80%", done: "4/5", lastActive: "1 hour ago", status: "On track", pill: "pill pill-teal", avatar: "" },
};

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

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await getCourse(id);
  return { title: course ? `${course.title} — Praxis` : "Course — Praxis" };
}

export default async function CourseEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const course = await getCourse(id);
  if (!course) notFound();

  const totalMinutes = await courseMinutes(course.id);
  const activityCount = course.modules.reduce((sum, m) => sum + m.activities.length, 0);
  const formatOptions = FORMATS.map((format) => ({ value: format, label: formatLabel(format) }));

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
          <Link className="btn btn-sm" href="/learn">
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
          <form action={publishCourseAction}>
            <input type="hidden" name="courseId" value={course.id} />
            <button className="btn btn-sm btn-primary" type="submit">
              Publish v{course.version + 1}
            </button>
          </form>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: "16px" }}>
        <div className="stat">
          <div className="label">Enrolled</div>
          <div className="value">{course.learners.length}</div>
          <div className="delta">+6 this week</div>
        </div>
        <div className="stat">
          <div className="label">Completion</div>
          <div className="value">76%</div>
          <div className="delta">+9 pts vs v{course.version - 1}</div>
        </div>
        <div className="stat">
          <div className="label">Median time on task</div>
          <div className="value">
            41<span style={{ fontSize: "14px", fontWeight: 500 }}> min</span>
          </div>
          <div className="delta">target {course.minutes} min</div>
        </div>
        <div className="stat">
          <div className="label">Needs a nudge</div>
          <div className="value">3</div>
          <div className="delta down">2 stuck on Module 3</div>
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
                <button className="btn btn-sm" type="button" disabled title="CSV export lands with the events table in week 10">
                  Export CSV
                </button>
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
                {course.learners.slice(0, 4).map((learner) => {
                  const fixture = LEARNER_FIXTURE[learner.id] ?? {
                    progress: "0%",
                    done: "0/5",
                    lastActive: "—",
                    status: "No activity",
                    pill: "pill",
                    avatar: "",
                  };
                  return (
                    <tr key={learner.id}>
                      <td style={{ paddingLeft: "20px" }}>
                        <div className="cell-user">
                          <span className={`avatar ${fixture.avatar}`.trim()}>{initials(learner.name)}</span>
                          <div>
                            <b style={{ fontWeight: 600 }}>{learner.name}</b>
                            <div className="tiny muted">{learner.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={learner.background === "non_cs" ? "pill pill-brand" : "pill"} style={learner.background === "cs" ? { background: "#eef2f6" } : undefined}>
                          {learner.background === "non_cs" ? "Non-CS" : "CS"}
                        </span>
                      </td>
                      <td>
                        <div className="row">
                          <div className="progress" style={{ width: "80px" }}>
                            <i style={{ width: fixture.progress }} />
                          </div>
                          <span className="tiny">{fixture.done}</span>
                        </div>
                      </td>
                      <td className="muted">{fixture.lastActive}</td>
                      <td>
                        <span className={fixture.pill}>{fixture.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="tiny muted" style={{ padding: "0 20px 14px" }}>
              Progress and status are prototype fixtures until the learner runtime writes to the event log.
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
                  <select className="select" id="audience" name="audience" defaultValue={course.audience}>
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
              <span className="pill pill-brand">On</span>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="between">
                <div>
                  <div style={{ fontSize: "12.6px", fontWeight: 600 }}>By background</div>
                  <div className="tiny muted">Non-CS gets analogies first</div>
                </div>
                <span className="pill pill-teal">Active</span>
              </div>
              <div className="divider" />
              <div className="between">
                <div>
                  <div style={{ fontSize: "12.6px", fontWeight: 600 }}>By pace</div>
                  <div className="tiny muted">Two stalls → easier variant</div>
                </div>
                <span className="pill pill-teal">Active</span>
              </div>
              <div className="divider" />
              <div className="between">
                <div>
                  <div style={{ fontSize: "12.6px", fontWeight: 600 }}>Language</div>
                  <div className="tiny muted">EN · 繁中 · 简中</div>
                </div>
                <span className="pill pill-line">EN</span>
              </div>
              <div className="divider" />
              <div className="between">
                <div>
                  <div style={{ fontSize: "12.6px", fontWeight: 600 }}>Accessibility</div>
                  <div className="tiny muted">Captions on generated audio</div>
                </div>
                <span className="pill pill-amber">2 gaps</span>
              </div>
              <Link className="btn btn-sm" style={{ justifyContent: "center" }} href="/studio">
                Edit rules
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
              <button className="btn btn-sm" type="button" style={{ marginTop: "2px" }} disabled title="Diff view lands in week 10">
                Compare v{course.version - 1} → v{course.version}
              </button>
            </div>
          </div>

          <div className="card card-pad" style={{ background: "#fffdf5", borderColor: "#fde9c8" }}>
            <div className="eyebrow" style={{ color: "#b45309" }}>
              Next action
            </div>
            <div style={{ fontSize: "12.5px", marginTop: "6px", lineHeight: 1.6 }}>
              9 learners have not reached Module 5. Schedule the wrap-up quiz as <b>in-class retrieval practice</b>{" "}
              instead of homework.
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
