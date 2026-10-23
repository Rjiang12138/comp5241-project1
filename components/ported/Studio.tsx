// Generated from prototype/studio.html by tools/html_to_tsx.py.
// Markup is copied verbatim from the mid-term prototype. Do not restyle here:
// change prototype/css/styles.css and re-run the converter instead.

import SideUser from "@/components/SideUser";
import { cohortsHref } from "@/lib/nav";
import type { Session } from "@/lib/auth";

export default function Studio({ session }: { session: Session }) {
  return (
    <>
      <div className="shell">


        <aside className="sidebar">
          <div className="side-brand">
            <span className="logo-mark sm">P</span> Praxis
            <span className="pill pill-line">beta</span>
          </div>

          <nav className="side-nav">
            <a href="/studio" className="active">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /><circle cx="12" cy="12" r="3.2" /></svg>
              Studio
            </a>
            <a href="/courses">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M4 5.5A2.5 2.5 0 016.5 3H19v18H6.5A2.5 2.5 0 014 18.5z" /><path d="M8 3v18" /></svg>
              My courses
              <span className="count">6</span>
            </a>
            <a href="/insights">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M4 19V5M4 19h16" /><path d="M8 15l3.5-4.5L15 13l4-6" /></svg>
              Insights
            </a>
            <a href={cohortsHref(session)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><path d="M16 11a3 3 0 100-6" /><path d="M18 14.5c2.2.6 3.5 2.3 3.5 4.5" /></svg>
              Cohorts
              <span className="count">2</span>
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
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M4 8h6M14 8h6M4 16h6M14 16h6" /><circle cx="12" cy="8" r="2" /><circle cx="12" cy="16" r="2" /></svg>
              Settings
            </a>
          </nav>

          <div className="side-foot">
            <SideUser session={session} />
          </div>
        </aside>


        <main>
          <div className="topbar">
            <div className="crumb">
              <span>Studio</span><span className="sep">/</span><span>New mini-course</span><span className="sep">/</span>
              <b>Draft</b>
            </div>
            <div className="topbar-right">
              <span className="pill pill-line"><span className="dot" style={{ background: '#12b76a' }}></span> Draft saved 2 min ago</span>
              <a className="btn btn-sm" href="/courses">Preview</a>
              <a className="btn btn-primary btn-sm" href="/courses">Publish to cohort</a>
            </div>
          </div>

          <div className="page">
            <div className="page-head">
              <div>
                <h1>Design a mini-course</h1>
                <p>Start from your own material or from a topic. You stay in control of every module.</p>
              </div>
              <div className="row">
                <span className="pill pill-brand">AI-assisted draft</span>
                <span className="pill pill-line">Model: praxis-tutor-1</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '336px minmax(0,1fr) 288px', gap: '16px', alignItems: 'start' }}>


              <div className="stack">
                <div className="card">
                  <div className="card-head"><h3>1 · Source material</h3><span className="tiny muted">3 files</span></div>
                  <div className="card-body" style={{ paddingBottom: '10px' }}>
                    <div className="chip-file"><span className="ext">PDF</span> Lecture03_requirements.pdf <span className="size">2.4 MB</span></div>
                    <div className="chip-file"><span className="ext md">MD</span> ai-agent-notes.md <span className="size">38 KB</span></div>
                    <div className="chip-file"><span className="ext" style={{ background: '#e0e7ff', color: '#3730a3' }}>CSV</span> cohort_background.csv <span className="size">11 KB</span></div>
                    <button className="btn btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: '2px' }}>+ Add material</button>
                  </div>
                </div>

                <div className="card">
                  <div className="card-head"><h3>2 · Brief</h3><span className="pill pill-line">~45 min</span></div>
                  <div className="card-body">
                    <div className="field">
                      <label>Course title</label>
                      <input className="input" value="Software Engineering Foundations" />
                    </div>
                    <div className="field">
                      <label>What should learners be able to do?</label>
                      <textarea className="textarea" id="brief">Design a 45-minute sequence for first-year students who have never written code. Cover what software engineering is, how requirements turn into a plan, and how to work with an AI coding agent without losing judgement. Every module needs one hands-on activity.</textarea>
                      <div className="hint">Be concrete about the outcome, the audience and the time budget.</div>
                    </div>
                    <div className="field">
                      <label>Audience</label>
                      <div className="seg" data-seg="audience">
                        <button data-val="noncs" className="on">Non-CS</button>
                        <button data-val="cs">CS</button>
                        <button data-val="mixed">Mixed</button>
                      </div>
                      <div className="hint">Drives vocabulary, examples and hint density.</div>
                    </div>
                    <div className="field mb-0">
                      <label>Session length</label>
                      <div className="seg" data-seg="length">
                        <button data-val="30">30 min</button>
                        <button data-val="45" className="on">45 min</button>
                        <button data-val="90">90 min</button>
                      </div>
                    </div>
                  </div>
                  <div className="card-body" style={{ borderTop: '1px solid var(--line-2)', paddingTop: '14px' }}>
                    <button className="btn btn-primary" id="genBtn" style={{ width: '100%', justifyContent: 'center' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></svg>
                      Generate outline
                    </button>
                    <div className="tiny muted" style={{ textAlign: 'center', marginTop: '8px' }}>You can edit, reorder or delete anything it produces.</div>
                  </div>
                </div>
              </div>


              <div className="card">
                <div className="card-head">
                  <div>
                    <h3>3 · Draft outline</h3>
                    <div className="tiny muted" id="genStatus" style={{ marginTop: '2px' }}>Draft ready · 5 modules · 6 activities · 47 min</div>
                  </div>
                  <div className="row">
                    <span className="pill pill-teal">Pedagogy checked</span>
                    <button className="btn btn-sm">Shuffle</button>
                  </div>
                </div>

                <div id="outline">
                  <div className="module-row">
                    <span className="module-idx">01</span>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '13px' }}>What software engineering actually is</div>
                      <div className="meta">Reading + reflection · explains why "coding" is the smallest part of the job</div>
                    </div>
                    <div className="right">
                      <span className="pill pill-line">Reading</span>
                      <span className="pill">6 min</span>
                    </div>
                  </div>

                  <div className="module-row">
                    <span className="module-idx">02</span>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '13px' }}>From idea to requirements</div>
                      <div className="meta">Interactive simulation · learner interviews a difficult stakeholder</div>
                    </div>
                    <div className="right">
                      <span className="pill pill-brand">Simulation</span>
                      <span className="pill">9 min</span>
                    </div>
                  </div>

                  <div className="module-row">
                    <span className="module-idx">03</span>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '13px' }}>Pairing with an AI coding agent</div>
                      <div className="meta">Code lab · write a validation rule, then review what the agent produced</div>
                    </div>
                    <div className="right">
                      <span className="pill pill-teal">Code lab</span>
                      <span className="pill">14 min</span>
                    </div>
                  </div>

                  <div className="module-row">
                    <span className="module-idx">04</span>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '13px' }}>Design review role play</div>
                      <div className="meta">Role play · defend a design decision to an AI reviewer</div>
                    </div>
                    <div className="right">
                      <span className="pill pill-amber">Role play</span>
                      <span className="pill">10 min</span>
                    </div>
                  </div>

                  <div className="module-row">
                    <span className="module-idx">05</span>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '13px' }}>Wrap-up: the definition of done</div>
                      <div className="meta">Quiz + retrieval practice · 6 questions, adaptive difficulty</div>
                    </div>
                    <div className="right">
                      <span className="pill">Quiz</span>
                      <span className="pill">8 min</span>
                    </div>
                  </div>

                  <div className="module-row" style={{ background: '#fbfbfd', borderTop: '1px dashed var(--line)' }}>
                    <span className="module-idx" style={{ background: '#fff', border: '1px dashed #d0d5dd' }}>+</span>
                    <div className="muted" style={{ fontSize: '12.5px' }}>Add module — or ask Praxis to propose one for the gap you see</div>
                    <div className="right"><button className="btn btn-sm btn-ghost">Suggest</button></div>
                  </div>
                </div>

                <div className="card-body" style={{ borderTop: '1px solid var(--line-2)', background: '#fbfbfd', borderRadius: '0 0 12px 12px' }}>
                  <div className="between">
                    <div className="row tiny muted">
                      <span>◈</span> Generated from 3 sources · 41 pages · no external content
                    </div>
                    <div className="row">
                      <button className="btn btn-sm">Compare with last draft</button>
                      <button className="btn btn-sm btn-primary">Send for review</button>
                    </div>
                  </div>
                </div>
              </div>


              <div className="stack">
                <div className="card">
                  <div className="card-head"><h3>Generation log</h3><span className="tiny muted mono">3.9s</span></div>
                  <div className="card-body" style={{ paddingTop: '8px' }}>
                    <div className="log">
                      <div className="log-step"><span className="tick">✓</span><div className="body"><b>Parse source material</b><span>3 files · 41 pages indexed</span></div><span className="time">1.2</span></div>
                      <div className="log-step"><span className="tick">✓</span><div className="body"><b>Extract learning outcomes</b><span>7 outcomes · 2 flagged as too vague</span></div><span className="time">0.8</span></div>
                      <div className="log-step"><span className="tick">✓</span><div className="body"><b>Draft module sequence</b><span>5 modules · 47 min projected</span></div><span className="time">1.6</span></div>
                      <div className="log-step"><span className="tick">✓</span><div className="body"><b>Match activity types</b><span>3 of 5 need a hands-on format</span></div><span className="time">2.1</span></div>
                      <div className="log-step"><span className="tick">✓</span><div className="body"><b>Check prerequisite order</b><span>no forward references found</span></div><span className="time">0.4</span></div>
                    </div>
                    <div className="footnote" style={{ marginTop: '10px' }}>Every step is logged so the draft can be audited later — see <span className="mono">docs/ai-usage-log.md</span>.</div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-head"><h3>Pedagogy check</h3><span className="pill pill-teal">3 / 4</span></div>
                  <div className="card-body" style={{ fontSize: '12.4px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
                    <div className="row"><span className="pill pill-teal" style={{ height: '18px', padding: '0 6px' }}>✓</span> Objectives map to activities</div>
                    <div className="row"><span className="pill pill-teal" style={{ height: '18px', padding: '0 6px' }}>✓</span> Cognitive load: 5 modules &lt; 7</div>
                    <div className="row"><span className="pill pill-teal" style={{ height: '18px', padding: '0 6px' }}>✓</span> Retrieval practice at the end</div>
                    <div className="row"><span className="pill pill-amber" style={{ height: '18px', padding: '0 6px' }}>!</span> Captions missing for 2 narrated slides</div>
                    <button className="btn btn-sm" style={{ marginTop: '4px' }}>Fix accessibility gap</button>
                  </div>
                </div>

                <div className="card card-pad" style={{ background: 'var(--brand-soft)', borderColor: '#dbe1ff' }}>
                  <div className="eyebrow" style={{ color: '#4338ca' }}>Tip</div>
                  <div style={{ fontSize: '12.4px', marginTop: '5px', lineHeight: '1.6' }}>
                    Add one sentence about <b>who your learners are</b>. Generic briefs produce generic examples —
                    the audience setting changes both wording and hint depth.
                  </div>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </>
  );
}
