// Generated from prototype/index.html by tools/html_to_tsx.py.
// Markup is copied verbatim from the mid-term prototype. Do not restyle here:
// change prototype/css/styles.css and re-run the converter instead.

export default function Landing() {
  return (
    <>
      <nav className="mk-nav">
        <div className="mk-brand"><span className="logo-mark">P</span> Praxis</div>
        <div className="mk-links">
          <a href="/studio">For instructors</a>
          <a href="/learn">For learners</a>
          <a href="/insights">Insights</a>
          <a href="/path">Self-directed paths</a>
        </div>
        <div className="mk-nav-right">
          <a className="btn btn-ghost btn-sm" href="#">Documentation</a>
          <a className="btn btn-sm" href="/learn">Sign in</a>
          <a className="btn btn-primary btn-sm" href="/studio">Open prototype</a>
        </div>
      </nav>

      <header className="mk-hero">
        <div>
          <span className="pill pill-brand"><span className="dot"></span> COMP5241 · Prototype v1</span>
          <h1>Turn lecture material into <em>interactive mini-courses</em>.</h1>
          <p className="mk-lede">
            Praxis is a GenAI course studio for software engineering education. Instructors bring a topic
            or a slide deck; Praxis drafts the modules, builds the activities — code labs, role plays,
            simulations — and keeps adapting to each learner's background.
          </p>
          <div className="mk-cta">
            <a className="btn btn-primary btn-lg" href="/studio">Open instructor studio <span className="kbd">⏎</span></a>
            <a className="btn btn-lg" href="/learn">See the learner view</a>
          </div>
          <div className="mk-note">
            <span className="pill pill-line">No sign-up</span>
            Runs on static prototype data · built for the mid-term review
          </div>
        </div>

        <div className="preview-wrap">
          <div className="preview">
            <div className="preview-bar">
              <i></i><i></i><i></i>
              <span>praxis.app/studio/courses/new</span>
            </div>
            <div className="preview-body">
              <div className="preview-title">
                <div>
                  <div className="eyebrow">Draft outline</div>
                  <strong style={{ fontSize: '14px' }}>Software Engineering Foundations</strong>
                </div>
                <span className="pill pill-teal">5 modules</span>
              </div>

              <div className="preview-row">
                <span className="idx">01</span>
                <div><strong>What software engineering actually is</strong>
                  <div className="tiny muted">Reading · 6 min</div></div>
                <span className="tag">Reading</span>
              </div>
              <div className="preview-row">
                <span className="idx">02</span>
                <div><strong>From idea to requirements</strong>
                  <div className="tiny muted">Interactive simulation · 9 min</div></div>
                <span className="tag b">Simulation</span>
              </div>
              <div className="preview-row">
                <span className="idx">03</span>
                <div><strong>Pairing with an AI coding agent</strong>
                  <div className="tiny muted">Code lab · 14 min</div></div>
                <span className="tag t">Code lab</span>
              </div>
              <div className="preview-row">
                <span className="idx">04</span>
                <div><strong>Design review role play</strong>
                  <div className="tiny muted">Role play · 10 min</div></div>
                <span className="tag">Role play</span>
              </div>
              <div className="preview-row" style={{ borderStyle: 'dashed', background: '#fbfbfd' }}>
                <span className="idx">+</span>
                <div><strong style={{ color: '#667085' }}>Add a module</strong></div>
                <span className="tag">AI suggest</span>
              </div>
            </div>
          </div>

          <div className="float-card a">
            <div className="tiny muted" style={{ marginBottom: '2px' }}>Adapted for</div>
            <div style={{ display: 'flex', gap: '4px', marginTop: '5px' }}>
              <span className="pill pill-brand" style={{ height: '21px' }}>Non-CS</span>
              <span className="pill pill-line" style={{ height: '21px' }}>CS</span>
            </div>
          </div>
          <div className="float-card b" style={{ width: '150px' }}>
            <div className="tiny muted">Cohort completion</div>
            <div style={{ fontSize: '19px', fontWeight: '650', letterSpacing: '-.02em', margin: '1px 0 6px' }}>76%</div>
            <div className="progress" style={{ height: '5px' }}><i style={{ width: '76%' }}></i></div>
          </div>
        </div>
      </header>

      <section className="mk-features">
        <div className="feature">
          <div className="feature-ico">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
              <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
              <circle cx="12" cy="12" r="3.4" />
            </svg>
          </div>
          <h3>Generate, don't author from scratch</h3>
          <p>Describe the topic, audience and length. Praxis drafts learning objectives, module flow and an assessment plan you can edit line by line.</p>
        </div>
        <div className="feature">
          <div className="feature-ico" style={{ background: '#ecfdf5', color: '#0f766e' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
              <path d="M4 7h16M4 12h10M4 17h6" /><circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <h3>Adapt to who is actually learning</h3>
          <p>One course, two voices: a non-CS learner gets the analogy and the "why"; a CS graduate gets the contract, the invariant and the failure modes.</p>
        </div>
        <div className="feature">
          <div className="feature-ico" style={{ background: '#fffaeb', color: '#b45309' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
              <path d="M4 19V5M4 19h16" /><path d="M8 15l4-5 3 3 4-6" />
            </svg>
          </div>
          <h3>See where learners get stuck</h3>
          <p>Every activity reports completion, attempts and time on task — so the next revision is driven by evidence instead of instinct.</p>
        </div>
      </section>

      <div className="mk-strip">
        <div><b>6 screens</b> in this prototype</div>
        <div><b>3 roles</b> instructor · learner · admin</div>
        <div><b>GenAI</b> delegated, described, discerned, documented</div>
        <div style={{ marginLeft: 'auto' }} className="sm">PolyU · Education 4.0 · COMP5241 Software Engineering</div>
      </div>
    </>
  );
}
