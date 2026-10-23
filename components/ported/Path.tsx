// Generated from prototype/path.html by tools/html_to_tsx.py.
// Markup is copied verbatim from the mid-term prototype. Do not restyle here:
// change prototype/css/styles.css and re-run the converter instead.

export default function Path() {
  return (
    <>
      <div className="player-top">
        <a className="exit" href="/" title="Home">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M15 5l-7 7 7 7" /></svg>
        </a>
        <div>
          <div className="player-title">My learning</div>
          <div className="player-sub">Self-directed path</div>
        </div>
        <div style={{ marginLeft: 'auto' }} className="row">
          <a className="btn btn-sm" href="/learn">Resume last course</a>
          <a className="btn btn-sm" href="/courses">Instructor view</a>
          <span className="avatar">MW</span>
        </div>
      </div>

      <div className="page" style={{ maxWidth: '1260px', margin: '0 auto' }}>

        <div className="page-head">
          <div>
            <h1 style={{ fontSize: '24px' }}>Build a path, not a playlist</h1>
            <p>Tell Praxis where you want to be. It sequences existing mini-courses and generates the missing ones.</p>
          </div>
          <span className="pill pill-teal">2 min to generate</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '348px minmax(0,1fr)', gap: '18px', alignItems: 'start' }}>


          <div className="stack">
            <div className="card">
              <div className="card-head"><h3>Your goal</h3><span className="tiny muted">step 1 of 2</span></div>
              <div className="card-body">
                <div className="field">
                  <label>What do you want to be able to do?</label>
                  <textarea className="textarea" style={{ minHeight: '74px' }}>Prepare for a backend engineering internship interview in four weeks. I study business, not CS, and I have only written small scripts.</textarea>
                </div>

                <div className="field">
                  <label>Domain</label>
                  <div className="seg" data-seg="domain" style={{ flexWrap: 'wrap' }}>
                    <button data-val="backend" className="on">Backend</button>
                    <button data-val="data">Data</button>
                    <button data-val="product">Product</button>
                    <button data-val="design">Design</button>
                  </div>
                </div>

                <div className="field">
                  <label>Starting point</label>
                  <div className="seg" data-seg="level">
                    <button data-val="beg" className="on">Beginner</button>
                    <button data-val="some">Some code</button>
                    <button data-val="conf">Confident</button>
                  </div>
                </div>

                <div className="field mb-0">
                  <label>Time you can give it</label>
                  <div className="seg" data-seg="time">
                    <button data-val="2">2 h / week</button>
                    <button data-val="4" className="on">4 h / week</button>
                    <button data-val="8">8 h / week</button>
                  </div>
                </div>
              </div>
              <div className="card-body" style={{ borderTop: '1px solid var(--line-2)', paddingTop: '14px' }}>
                <button className="btn btn-primary" id="buildPath" style={{ width: '100%', justifyContent: 'center' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></svg>
                  Design my path
                </button>
                <div className="tiny muted" style={{ textAlign: 'center', marginTop: '8px' }}>Matches your level, not an average learner's.</div>
              </div>
            </div>

            <div className="card card-pad">
              <div className="eyebrow">Already in the library</div>
              <div className="stack mt-12" style={{ gap: '9px' }}>
                <div className="between" style={{ fontSize: '12.5px' }}><span>Software Engineering Foundations</span><span className="tiny muted">47 min</span></div>
                <div className="between" style={{ fontSize: '12.5px' }}><span>Working with AI coding agents</span><span className="tiny muted">35 min</span></div>
                <div className="between" style={{ fontSize: '12.5px' }}><span>Read a code review like a reviewer</span><span className="tiny muted">28 min</span></div>
              </div>
              <div className="footnote">Two of the four steps below are generated on demand — they do not exist in the library yet.</div>
            </div>
          </div>


          <div className="card">
            <div className="card-head">
              <div>
                <h3>Backend internship · 4-week path</h3>
                <div className="tiny muted" style={{ marginTop: '2px' }}>4 steps · 9 activities · 4 h / week · adapted to beginner, non-CS</div>
              </div>
              <div className="row">
                <span className="pill pill-brand">AI-sequenced</span>
                <button className="btn btn-sm">Edit</button>
              </div>
            </div>

            <div className="card-body">
              <div className="timeline">

                <div className="tl-item done">
                  <div className="between" style={{ alignItems: 'flex-start' }}>
                    <div>
                      <div className="row" style={{ gap: '8px' }}><b style={{ fontSize: '13.6px' }}>Week 1 · Learn what the job actually is</b><span className="pill pill-teal">done</span></div>
                      <div className="tiny muted" style={{ marginTop: '3px' }}>2 h · 3 activities · from the library</div>
                    </div>
                    <span className="tiny muted">100%</span>
                  </div>
                  <div className="wrap mt-8">
                    <span className="pill pill-line">Software Engineering Foundations · M1–M2</span>
                    <span className="pill pill-line">What a backend engineer ships in a week</span>
                  </div>
                </div>

                <div className="tl-item now">
                  <div className="between" style={{ alignItems: 'flex-start' }}>
                    <div>
                      <div className="row" style={{ gap: '8px' }}><b style={{ fontSize: '13.6px' }}>Week 2 · Build one real service</b><span className="pill pill-brand">you are here</span></div>
                      <div className="tiny muted" style={{ marginTop: '3px' }}>2 h · 2 activities · generated for this path</div>
                    </div>
                    <span className="tiny muted">40%</span>
                  </div>
                  <div className="wrap mt-8">
                    <span className="pill pill-teal">Code lab · build a REST endpoint with an agent</span>
                    <span className="pill pill-line">Reading · how HTTP actually works</span>
                  </div>
                  <div className="tiny muted mt-8" style={{ lineHeight: '1.6' }}>
                    Generated because your goal mentions an interview: the lab ends with a 3-minute explanation of your own design,
                    which is the part candidates usually fail.
                  </div>
                </div>

                <div className="tl-item">
                  <div className="between" style={{ alignItems: 'flex-start' }}>
                    <div>
                      <div className="row" style={{ gap: '8px' }}><b style={{ fontSize: '13.6px' }}>Week 3 · Review code you did not write</b><span className="pill">not started</span></div>
                      <div className="tiny muted" style={{ marginTop: '3px' }}>1.5 h · 2 activities · from the library</div>
                    </div>
                    <span className="tiny muted">0%</span>
                  </div>
                  <div className="wrap mt-8">
                    <span className="pill pill-amber">Role play · design review with an AI reviewer</span>
                    <span className="pill pill-line">Checklist · what to look for in a diff</span>
                  </div>
                </div>

                <div className="tl-item">
                  <div className="between" style={{ alignItems: 'flex-start' }}>
                    <div>
                      <div className="row" style={{ gap: '8px' }}><b style={{ fontSize: '13.6px' }}>Week 4 · Practise the interview itself</b><span className="pill">not started</span></div>
                      <div className="tiny muted" style={{ marginTop: '3px' }}>1.5 h · 2 activities · generated for this path</div>
                    </div>
                    <span className="tiny muted">0%</span>
                  </div>
                  <div className="wrap mt-8">
                    <span className="pill pill-amber">Mock interview · 25 min, scored against a rubric</span>
                    <span className="pill pill-line">Reflection · what to fix before the real one</span>
                  </div>
                </div>

              </div>
            </div>

            <div className="card-body" style={{ borderTop: '1px solid var(--line-2)', background: '#fbfbfd', borderRadius: '0 0 12px 12px' }}>
              <div className="between">
                <div className="row tiny muted" style={{ maxWidth: '560px', lineHeight: '1.5' }}>
                  <span style={{ color: '#4338ca' }}>◈</span>
                  Why this order: you cannot review a diff before you have shipped one, and you cannot explain a design
                  you have not defended. Each step unlocks the evidence the next one needs.
                </div>
                <div className="row">
                  <button className="btn btn-sm">Swap a step</button>
                  <button className="btn btn-sm btn-primary">Add to my path</button>
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className="card card-pad mt-16" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: '#ecfdf5', color: '#0f766e', display: 'grid', placeItems: 'center' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M4 6h16M4 12h10M4 18h7" /></svg>
          </div>
          <div style={{ flex: '1' }}>
            <div style={{ fontSize: '13px', fontWeight: '600' }}>Need a subject Praxis has never taught?</div>
            <div className="tiny muted" style={{ marginTop: '2px' }}>Generate a mini-course for any domain — then it becomes available to everyone in the library.</div>
          </div>
          <button className="btn btn-sm">Generate a new course</button>
        </div>

      </div>
    </>
  );
}
