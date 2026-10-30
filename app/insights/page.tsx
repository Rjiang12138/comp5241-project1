import { cookies } from "next/headers";
import { Shell } from "@/components/Shell";
import { requireStaff } from "@/lib/auth";
import { courseAnalytics, courseWithMostLearners, listCourses } from "@/lib/store";
import { dismissInsightAction, nudgeAction, nudgeAllAction, restoreInsightAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Insights — Praxis" };

type Search = { course?: string; range?: string };

const RANGES = [
  { key: "7", label: "7 days", days: 7 },
  { key: "30", label: "30 days", days: 30 },
  { key: "all", label: "All", days: null as number | null },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Relative time, so the table reads "3 days ago" instead of a timestamp. */
function ago(date: Date | null): string {
  if (!date) return "never";
  const days = Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

/**
 * The engagement chart, drawn from the weekly series.
 *
 * The prototype shipped eight hand-placed points. These are computed: x is the
 * index, y is the percentage, and the axis is fixed at 0–100 so a good week and
 * a bad week are visually comparable instead of both filling the box.
 */
function chart(values: number[]) {
  const left = 30;
  const right = 700;
  const top = 40;
  const bottom = 190;
  const step = values.length > 1 ? (right - left) / (values.length - 1) : 0;
  const y = (value: number) => bottom - (Math.min(100, Math.max(0, value)) / 100) * (bottom - top);

  const points = values.map((value, index) => ({ x: left + index * step, y: y(value), value }));
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${left},${bottom} ${line} ${right},${bottom}`;
  return { points, line, area };
}

export default async function InsightsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const session = await requireStaff();
  const [courses, busiest] = await Promise.all([listCourses(), courseWithMostLearners()]);

  const course =
    courses.find((row) => row.id === params.course) ??
    courses.find((row) => row.id === busiest) ??
    courses.find((row) => row.moduleCount > 0) ??
    courses[0];

  if (!course) {
    return (
      <Shell session={session} active="insights" crumb={<><span>Insights</span></>}>
        <div className="page-head">
          <div>
            <h1>Where the course is working</h1>
            <p>No course exists yet.</p>
          </div>
        </div>
      </Shell>
    );
  }

  const rangeKey = params.range ?? "all";
  const range = RANGES.find((item) => item.key === rangeKey) ?? RANGES[2];
  const analytics = await courseAnalytics(course.id, range.days);

  const jar = await cookies();
  const dismissed = jar.get(`praxis_insight_${course.id}`)?.value === "dismissed";

  const series = chart(analytics.weekly.map((point) => point.value));
  const maxPct = Math.max(1, ...analytics.byFormat.map((row) => row.pct));
  const worst = analytics.byFormat[analytics.byFormat.length - 1];
  const best = analytics.byFormat[0];
  const gap = best && worst ? best.pct - worst.pct : 0;

  return (
    <Shell
      session={session}
      active="insights"
      courseCount={courses.length}
      crumb={
        <>
          <span>Insights</span>
          <span className="sep">/</span>
          <b>{course.title}</b>
        </>
      }
      actions={
        <>
          <div className="seg">
            {RANGES.map((item) => (
              <form action="/insights" key={item.key} style={{ display: "contents" }}>
                <input type="hidden" name="course" value={course.id} />
                <input type="hidden" name="range" value={item.key} />
                <button type="submit" className={item.key === range.key ? "on" : undefined}>
                  {item.label}
                </button>
              </form>
            ))}
          </div>
          <a className="btn btn-sm" href={`/insights/export?course=${course.id}&range=${range.key}`}>
            Export report
          </a>
        </>
      }
    >
      <div className="page-head">
        <div>
          <h1>Where the course is working</h1>
          <p>
            {course.code} · {analytics.learners} learners ·{" "}
            {range.days
              ? `attempts and questions from the last ${range.days} days, progress as it stands`
              : "all time, computed from the event log on every request"}
          </p>
        </div>
        <span className="pill pill-brand">Live query · no cached counters</span>
      </div>

      <div className="grid-4" style={{ marginBottom: "16px" }}>
        <div className="stat">
          <div className="label">Active this week</div>
          <div className="value">
            {Math.round((analytics.activeThisWeek / 100) * analytics.learners)}
            <span style={{ fontSize: "13px", fontWeight: "500", color: "#98a2b3" }}> / {analytics.learners}</span>
          </div>
          <div className="delta">{analytics.activeThisWeek}% wrote at least one event</div>
        </div>
        <div className="stat">
          <div className="label">Average progress</div>
          <div className="value">{analytics.averageProgress}%</div>
          <div className="delta">
            {analytics.finishedAll} of {analytics.learners} finished every activity
          </div>
        </div>
        <div className="stat">
          <div className="label">Median attempts / activity</div>
          <div className="value">{analytics.medianAttempts.toFixed(1)}</div>
          <div className={analytics.medianAttempts > 2 ? "delta down" : "delta"}>target ≤ 2.0</div>
        </div>
        <div className="stat">
          <div className="label">Tutor questions asked</div>
          <div className="value">{analytics.tutorQuestions}</div>
          <div className="delta">every one is in the log</div>
        </div>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: "1.45fr 1fr", marginBottom: "16px" }}>
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Weekly engagement</h3>
              <div className="tiny muted" style={{ marginTop: "2px" }}>
                Share of cohort with at least one event that week
              </div>
            </div>
            <div className="row tiny muted">
              <span style={{ display: "inline-block", width: "9px", height: "2px", background: "#4f46e5" }}></span> engagement
              <span style={{ display: "inline-block", width: "9px", height: "0", borderTop: "2px dashed #98a2b3", marginLeft: "10px" }}></span> target 80%
            </div>
          </div>
          <div className="card-body">
            <svg className="chart" viewBox="0 0 720 220" preserveAspectRatio="none" style={{ height: "212px" }}>
              <defs>
                <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity=".26" />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                </linearGradient>
              </defs>

              <g stroke="#eef0f3" strokeWidth="1">
                {[0, 25, 50, 75, 100].map((tick) => (
                  <line key={tick} x1={30} y1={190 - (tick / 100) * 150} x2={700} y2={190 - (tick / 100) * 150} />
                ))}
              </g>

              <line x1="30" y1={190 - 0.8 * 150} x2="700" y2={190 - 0.8 * 150} stroke="#c8ced8" strokeWidth="1.5" strokeDasharray="5 5" />

              <polygon points={series.area} fill="url(#area)" />
              <polyline points={series.line} fill="none" stroke="#4f46e5" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />

              <g fill="#fff" stroke="#4f46e5" strokeWidth="2.2">
                {series.points.map((point) => (
                  <circle key={point.x} cx={point.x} cy={point.y} r="3.4" />
                ))}
              </g>

              <g fill="#98a2b3" fontFamily="Segoe UI" fontSize="11">
                {analytics.weekly.map((point, index) => (
                  <text key={point.label} x={series.points[index].x} y={208} textAnchor="middle">
                    {point.label}
                  </text>
                ))}
              </g>

              <g fill="#4f46e5" fontFamily="Segoe UI" fontSize="10">
                {series.points.map((point) => (
                  <text key={point.x} x={point.x} y={point.y - 9} textAnchor="middle">
                    {point.value}
                  </text>
                ))}
              </g>
            </svg>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Completion by activity type</h3>
            <span className="tiny muted">{range.days ? `last ${range.days} days` : "all-time"}</span>
          </div>
          <div className="card-body">
            {analytics.byFormat.length === 0 ? (
              <div className="tiny muted">This course has no activities yet.</div>
            ) : (
              <div className="bars">
                {analytics.byFormat.map((row) => (
                  <div className="bar-row" key={row.format}>
                    <span>{row.label}</span>
                    <span className="bar-track">
                      <i
                        className={row.pct >= 80 ? "t" : row.pct >= 60 ? "" : "a"}
                        style={{ width: `${Math.round((row.pct / maxPct) * 100)}%` }}
                      ></i>
                    </span>
                    <span className="tiny muted" style={{ textAlign: "right" }}>{row.pct}%</span>
                  </div>
                ))}
              </div>
            )}

            <div className="divider" style={{ margin: "16px 0 14px" }}></div>

            {analytics.byFormat.length >= 2 ? (
              <div className="between">
                <div>
                  <div style={{ fontSize: "12.6px", fontWeight: "600" }}>{worst.label} finishes lowest</div>
                  <div className="tiny muted" style={{ marginTop: "2px" }}>
                    {gap} pts below {best.label}
                  </div>
                </div>
                <span className={gap >= 10 ? "pill pill-amber" : "pill pill-teal"}>{gap >= 10 ? "Watch" : "Fine"}</span>
              </div>
            ) : (
              <div className="tiny muted">Not enough format variety to compare yet.</div>
            )}
          </div>
        </div>
      </div>

      {analytics.insight && !dismissed ? (
        <div className="card" style={{ marginBottom: "16px", borderColor: "#dbe1ff", background: "linear-gradient(180deg,#f7f8ff,#fff)" }}>
          <div className="card-body" style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "16px", alignItems: "center" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "var(--brand-soft)", display: "grid", placeItems: "center", color: "#4338ca" }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3" /><circle cx="12" cy="12" r="3.4" /></svg>
            </div>
            <div>
              <div className="row" style={{ marginBottom: "3px" }}>
                <b style={{ fontSize: "13.4px" }}>Praxis insight</b>
                <span className="pill pill-line">derived from this course</span>
                <span className="tiny muted">{analytics.byFormat.length} formats compared</span>
              </div>
              <div style={{ fontSize: "13px", color: "var(--ink-2)", lineHeight: "1.6" }}>
                <b>{analytics.insight.headline}.</b> {analytics.insight.body}
              </div>
            </div>
            <div className="row">
              <form action={dismissInsightAction}>
                <input type="hidden" name="courseId" value={course.id} />
                <button className="btn btn-sm" type="submit">Dismiss</button>
              </form>
              <a className="btn btn-sm btn-primary" href={`/courses/${course.id}`}>
                Open the editor
              </a>
            </div>
          </div>
        </div>
      ) : null}

      {analytics.insight && dismissed ? (
        <div className="card card-pad" style={{ marginBottom: "16px" }}>
          <div className="between">
            <div className="tiny muted">The insight for this course is hidden for a week.</div>
            <form action={restoreInsightAction}>
              <input type="hidden" name="courseId" value={course.id} />
              <button className="btn btn-sm" type="submit">Show it again</button>
            </form>
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="card-head">
          <div>
            <h3>Learners who need a nudge</h3>
            <div className="tiny muted" style={{ marginTop: "2px" }}>
              Ranked by activities finished, then by time since the last one
            </div>
          </div>
          <form action={nudgeAllAction}>
            <input type="hidden" name="courseId" value={course.id} />
            <button className="btn btn-sm" type="submit" disabled={analytics.nudge.length === 0}>
              Nudge all ({analytics.nudge.length})
            </button>
          </form>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ paddingLeft: "20px" }}>Learner</th>
              <th>Signal</th>
              <th>Progress</th>
              <th>Last activity</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {analytics.nudge.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ paddingLeft: "20px" }} className="muted">
                  Everyone has finished every activity. Nothing to chase.
                </td>
              </tr>
            ) : (
              analytics.nudge.map((row) => (
                <tr key={row.userId}>
                  <td style={{ paddingLeft: "20px" }}>
                    <div className="cell-user">
                      <span className="avatar a">{initials(row.name)}</span>
                      <div>
                        <b style={{ fontWeight: "600" }}>{row.name}</b>
                        <div className="tiny muted">{row.background === "cs" ? "CS" : "Non-CS"}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={row.tone === "rose" ? "pill pill-rose" : "pill pill-amber"}>{row.signal}</span>
                  </td>
                  <td>
                    <div className="row">
                      <div className="progress" style={{ width: "74px" }}>
                        <i style={{ width: `${Math.round((row.completed / Math.max(1, row.total)) * 100)}%` }}></i>
                      </div>
                      <span className="tiny">{row.completed}/{row.total}</span>
                    </div>
                  </td>
                  <td className="muted">{ago(row.lastActive)}</td>
                  <td>
                    <form action={nudgeAction}>
                      <input type="hidden" name="courseId" value={course.id} />
                      <input type="hidden" name="userId" value={row.userId} />
                      <button className="btn btn-sm" type="submit">Nudge</button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="card-body" style={{ borderTop: "1px solid var(--line-2)" }}>
          <div className="tiny muted">
            A nudge is an event, not an email: it writes one row to the log so the next report can show whether chasing
            worked. Wiring it to an actual message is a mail-provider decision, not a UI one.
          </div>
        </div>
      </div>
    </Shell>
  );
}
