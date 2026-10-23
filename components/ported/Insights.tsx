// Generated from prototype/analytics.html by tools/html_to_tsx.py.
// Markup is copied verbatim from the mid-term prototype. Do not restyle here:
// change prototype/css/styles.css and re-run the converter instead.

import SideUser from "@/components/SideUser";
import { cohortsHref } from "@/lib/nav";
import type { Session } from "@/lib/auth";

export default function Insights({ session }: { session: Session }) {
  return (
    <>
      <div className="shell">

        <aside className="sidebar">
          <div className="side-brand"><span className="logo-mark sm">P</span> Praxis <span className="pill pill-line">beta</span></div>
          <nav className="side-nav">
            <a href="/studio">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /><circle cx="12" cy="12" r="3.2" /></svg>
              Studio
            </a>
            <a href="/courses">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M4 5.5A2.5 2.5 0 016.5 3H19v18H6.5A2.5 2.5 0 014 18.5z" /><path d="M8 3v18" /></svg>
              My courses <span className="count">6</span>
            </a>
            <a href="/insights" className="active">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M4 19V5M4 19h16" /><path d="M8 15l3.5-4.5L15 13l4-6" /></svg>
              Insights
            </a>
            <a href={cohortsHref(session)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><path d="M16 11a3 3 0 100-6" /></svg>
              Cohorts <span className="count">2</span>
            </a>
            <div className="side-label">Workspace</div>
            <a href="/path">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M4 6h6M4 12h10M4 18h6" /><circle cx="17" cy="17" r="3" /></svg>
              Learner paths
            </a>
            <a href="/learn">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M4 5.5A2.5 2.5 0 016.5 3H19v18H6.5A2.5 2.5 0 014 18.5z" /><path d="M9 9h6M9 13h4" /></svg>
              Preview as learner
            </a>
            <a href="/settings">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="15" cy="7" r="2.2" /><circle cx="9" cy="17" r="2.2" /></svg>
              Settings
            </a>
          </nav>
          <div className="side-foot">
            <SideUser session={session} />
          </div>
        </aside>

        <main>
          <div className="topbar">
            <div className="crumb"><span>Insights</span><span className="sep">/</span><b>Software Engineering Foundations</b></div>
            <div className="topbar-right">
              <div className="seg" data-seg="range">
                <button data-val="7" className="on">7 days</button>
                <button data-val="30">30 days</button>
                <button data-val="all">All</button>
              </div>
              <button className="btn btn-sm">Export report</button>
            </div>
          </div>

          <div className="page">
            <div className="page-head">
              <div>
                <h1>Where the course is working</h1>
                <p>COMP5241 L01 · 24 learners · updated 4 minutes ago</p>
              </div>
              <span className="pill pill-brand">Live data from prototype seed</span>
            </div>

            <div className="grid-4" style={{ marginBottom: '16px' }}>
              <div className="stat">
                <div className="label">Active this week</div>
                <div className="value">21<span style={{ fontSize: '13px', fontWeight: '500', color: '#98a2b3' }}> / 24</span></div>
                <div className="delta">88% · +4 vs last week</div>
              </div>
              <div className="stat">
                <div className="label">Course completion</div>
                <div className="value">76%</div>
                <div className="delta">+9 pts since hint scaffolding</div>
              </div>
              <div className="stat">
                <div className="label">Median attempts / code lab</div>
                <div className="value">2.4</div>
                <div className="delta down">target ≤ 2.0</div>
              </div>
              <div className="stat">
                <div className="label">Tutor questions asked</div>
                <div className="value">147</div>
                <div className="delta">62% answered from course material</div>
              </div>
            </div>

            <div className="grid-2" style={{ gridTemplateColumns: '1.45fr 1fr', marginBottom: '16px' }}>

              <div className="card">
                <div className="card-head">
                  <div><h3>Weekly engagement</h3><div className="tiny muted" style={{ marginTop: '2px' }}>Share of cohort with at least one completed activity</div></div>
                  <div className="row tiny muted"><span style={{ display: 'inline-block', width: '9px', height: '2px', background: '#4f46e5' }}></span> engagement <span style={{ display: 'inline-block', width: '9px', height: '0', borderTop: '2px dashed #98a2b3', marginLeft: '10px' }}></span> target 80%</div>
                </div>
                <div className="card-body">
                  <svg className="chart" viewBox="0 0 720 220" preserveAspectRatio="none" style={{ height: '212px' }}>
                    <defs>
                      <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4f46e5" stopOpacity=".26" />
                        <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    <g stroke="#eef0f3" strokeWidth="1">
                      <line x1="30" y1="40" x2="700" y2="40" />
                      <line x1="30" y1="77.5" x2="700" y2="77.5" />
                      <line x1="30" y1="115" x2="700" y2="115" />
                      <line x1="30" y1="152.5" x2="700" y2="152.5" />
                      <line x1="30" y1="190" x2="700" y2="190" />
                    </g>

                    <line x1="30" y1="65" x2="700" y2="65" stroke="#c8ced8" strokeWidth="1.5" strokeDasharray="5 5" />

                    <path d="M30,190 L30,160 L124,137.5 L218,147.5 L312,107.5 L406,120 L500,87.5 L594,95 L688,75 L688,190 Z" fill="url(#area)" />

                    <path d="M30,160 L124,137.5 L218,147.5 L312,107.5 L406,120 L500,87.5 L594,95 L688,75" fill="none" stroke="#4f46e5" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />

                    <g fill="#fff" stroke="#4f46e5" strokeWidth="2.2">
                      <circle cx="30" cy="160" r="3.4" /><circle cx="124" cy="137.5" r="3.4" />
                      <circle cx="218" cy="147.5" r="3.4" /><circle cx="312" cy="107.5" r="3.4" />
                      <circle cx="406" cy="120" r="3.4" /><circle cx="500" cy="87.5" r="3.4" />
                      <circle cx="594" cy="95" r="3.4" /><circle cx="688" cy="75" r="3.4" />
                    </g>

                    <line x1="500" y1="87.5" x2="500" y2="190" stroke="#c7d2fe" strokeWidth="1" strokeDasharray="3 3" />
                    <rect x="420" y="44" width="156" height="26" rx="6" fill="#101828" />
                    <text x="434" y="61" fill="#fff" fontFamily="Segoe UI" fontSize="12">W6 · 71% · hints added</text>

                    <g fill="#98a2b3" fontFamily="Segoe UI" fontSize="11">
                      <text x="30" y="208" textAnchor="middle">W1</text>
                      <text x="124" y="208" textAnchor="middle">W2</text>
                      <text x="218" y="208" textAnchor="middle">W3</text>
                      <text x="312" y="208" textAnchor="middle">W4</text>
                      <text x="406" y="208" textAnchor="middle">W5</text>
                      <text x="500" y="208" textAnchor="middle">W6</text>
                      <text x="594" y="208" textAnchor="middle">W7</text>
                      <text x="688" y="208" textAnchor="middle">W8</text>
                    </g>
                  </svg>
                </div>
              </div>

              <div className="card">
                <div className="card-head"><h3>Completion by activity type</h3><span className="tiny muted">all-time</span></div>
                <div className="card-body">
                  <div className="bars">
                    <div className="bar-row"><span>Reading</span><span className="bar-track"><i className="t" style={{ width: '100%' }}></i></span><span className="tiny muted" style={{ textAlign: 'right' }}>100%</span></div>
                    <div className="bar-row"><span>Quiz</span><span className="bar-track"><i className="t" style={{ width: '92%' }}></i></span><span className="tiny muted" style={{ textAlign: 'right' }}>92%</span></div>
                    <div className="bar-row"><span>Role play</span><span className="bar-track"><i style={{ width: '81%' }}></i></span><span className="tiny muted" style={{ textAlign: 'right' }}>81%</span></div>
                    <div className="bar-row"><span>Code lab</span><span className="bar-track"><i className="a" style={{ width: '64%' }}></i></span><span className="tiny muted" style={{ textAlign: 'right' }}>64%</span></div>
                    <div className="bar-row"><span>Simulation</span><span className="bar-track"><i className="a" style={{ width: '58%' }}></i></span><span className="tiny muted" style={{ textAlign: 'right' }}>58%</span></div>
                  </div>

                  <div className="divider" style={{ margin: '16px 0 14px' }}></div>

                  <div className="between">
                    <div>
                      <div style={{ fontSize: '12.6px', fontWeight: '600' }}>Hands-on formats underperform</div>
                      <div className="tiny muted" style={{ marginTop: '2px' }}>28 pts gap between reading and simulation</div>
                    </div>
                    <span className="pill pill-amber">Watch</span>
                  </div>
                  <div className="tiny muted" style={{ marginTop: '9px', lineHeight: '1.6' }}>
                    Consistent with the Module 3 drop-off: learners start the hands-on activity and leave before the checkpoint.
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px', borderColor: '#dbe1ff', background: 'linear-gradient(180deg,#f7f8ff,#fff)' }}>
              <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '16px', alignItems: 'center' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--brand-soft)', display: 'grid', placeItems: 'center', color: '#4338ca' }}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3" /><circle cx="12" cy="12" r="3.4" /></svg>
                </div>
                <div>
                  <div className="row" style={{ marginBottom: '3px' }}>
                    <b style={{ fontSize: '13.4px' }}>Praxis insight</b>
                    <span className="pill pill-line">evidence-linked</span>
                    <span className="tiny muted">model: praxis-insight-1 · 0.4s</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: '1.6' }}>
                    9 learners stall on <b>3.2 Code lab</b> after the second failed test run; 7 of them never open the hint.
                    Suggested change: surface the first hint automatically after one failure, and add a worked example before the lab.
                  </div>
                </div>
                <div className="row">
                  <button className="btn btn-sm">Dismiss</button>
                  <button className="btn btn-sm btn-primary">Apply suggestion</button>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <div><h3>Learners who need a nudge</h3><div className="tiny muted" style={{ marginTop: '2px' }}>Ranked by time since last completed activity</div></div>
                <button className="btn btn-sm">Message all</button>
              </div>
              <table className="tbl">
                <thead><tr><th style={{ paddingLeft: '20px' }}>Learner</th><th>Signal</th><th>Progress</th><th>Last activity</th><th></th></tr></thead>
                <tbody>
                  <tr>
                    <td style={{ paddingLeft: '20px' }}><div className="cell-user"><span className="avatar a">SK</span><div><b style={{ fontWeight: '600' }}>Sara Khan</b><div className="tiny muted">Non-CS · joined week 1</div></div></div></td>
                    <td><span className="pill pill-rose">3 failed attempts on 3.2</span></td>
                    <td><div className="row"><div className="progress" style={{ width: '74px' }}><i style={{ width: '40%' }}></i></div><span className="tiny">2/5</span></div></td>
                    <td className="muted">3 days ago</td>
                    <td><button className="btn btn-sm">Nudge</button></td>
                  </tr>
                  <tr>
                    <td style={{ paddingLeft: '20px' }}><div className="cell-user"><span className="avatar">AL</span><div><b style={{ fontWeight: '600' }}>Arjun Lee</b><div className="tiny muted">CS · joined week 1</div></div></div></td>
                    <td><span className="pill pill-amber">Idle 2 days at 3.3</span></td>
                    <td><div className="row"><div className="progress" style={{ width: '74px' }}><i style={{ width: '60%' }}></i></div><span className="tiny">3/5</span></div></td>
                    <td className="muted">Yesterday</td>
                    <td><button className="btn btn-sm">Nudge</button></td>
                  </tr>
                  <tr>
                    <td style={{ paddingLeft: '20px' }}><div className="cell-user"><span className="avatar rose">JC</span><div><b style={{ fontWeight: '600' }}>Joy Chan</b><div className="tiny muted">Non-CS · joined week 2</div></div></div></td>
                    <td><span className="pill pill-amber">Skipped Module 2 entirely</span></td>
                    <td><div className="row"><div className="progress" style={{ width: '74px' }}><i style={{ width: '20%' }}></i></div><span className="tiny">1/5</span></div></td>
                    <td className="muted">4 days ago</td>
                    <td><button className="btn btn-sm">Nudge</button></td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </main>
      </div>
    </>
  );
}
