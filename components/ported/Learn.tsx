// Generated from prototype/learn.html by tools/html_to_tsx.py.
// Markup is copied verbatim from the mid-term prototype. Do not restyle here:
// change prototype/css/styles.css and re-run the converter instead.

export default function Learn() {
  return (
    <>
      <div className="player-top">
        <a className="exit" href="/courses/c-sef" title="Back to course">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M15 5l-7 7 7 7" /></svg>
        </a>
        <div>
          <div className="player-title">Software Engineering Foundations</div>
          <div className="player-sub">Module 3 of 5 · Code lab</div>
        </div>

        <div className="player-progress">
          <div className="progress" style={{ width: '150px' }}><i style={{ width: '42%' }}></i></div>
          <span className="tiny muted">42%</span>
        </div>

        <div style={{ marginLeft: 'auto' }} className="row">
          <span className="pill pill-line"><span className="dot" style={{ background: '#12b76a' }}></span> Autosaved</span>
          <span className="pill pill-brand">Non-CS track</span>
          <a className="btn btn-sm" href="/path">My path</a>
        </div>
      </div>

      <div className="player-body">


        <div className="stack">
          <div className="card card-pad">
            <div className="between">
              <div className="eyebrow">Course progress</div>
              <span className="tiny muted">3 / 6</span>
            </div>
            <div className="progress mt-8" style={{ height: '7px' }}><i style={{ width: '42%' }}></i></div>
            <div className="tiny muted mt-8">Next checkpoint: 4 of 6 · ~12 min left</div>
          </div>

          <div className="card">
            <div className="card-head"><h3 style={{ fontSize: '12.5px' }}>Your path</h3><span className="tiny muted">47 min</span></div>
            <div className="card-body" style={{ padding: '8px' }}>
              <div className="lesson-list">
                <a href="#" className="ok"><span className="n">01</span> What software engineering is <span style={{ marginLeft: 'auto', color: '#12b76a' }}>✓</span></a>
                <a href="#" className="ok"><span className="n">02</span> From idea to requirements <span style={{ marginLeft: 'auto', color: '#12b76a' }}>✓</span></a>
              </div>
              <div className="side-label" style={{ padding: '10px 9px 4px' }}>Module 3 · in progress</div>
              <div className="lesson-list">
                <a href="#" className="ok"><span className="n">3.1</span> What the agent can see</a>
                <a href="#" className="now"><span className="n">3.2</span> Code lab: validation rule</a>
                <a href="#"><span className="n">3.3</span> Review the agent's patch</a>
              </div>
              <div className="side-label" style={{ padding: '10px 9px 4px' }}>Up next</div>
              <div className="lesson-list">
                <a href="#"><span className="n">04</span> Design review role play</a>
                <a href="#"><span className="n">05</span> Definition of done</a>
              </div>
            </div>
          </div>

          <div className="card card-pad">
            <div className="eyebrow">This page adapts to you</div>
            <div className="tiny muted mt-8" style={{ lineHeight: '1.6' }}>
              You are on the non-CS track, so explanations start with an analogy and the hint appears after one failed attempt.
            </div>
          </div>
        </div>


        <div className="stack">
          <div className="card">
            <div className="card-head">
              <div className="row">
                <span className="pill pill-teal">Code lab</span>
                <span className="tiny muted">8 min · Module 3.2</span>
              </div>
              <div className="row">
                <span className="pill pill-amber" id="testsBadge">2 / 3 passing</span>
                <span className="tiny muted">attempt 2 of 3</span>
              </div>
            </div>

            <div className="card-body">
              <h2 style={{ fontSize: '19px', letterSpacing: '-.02em' }}>Write the rule first — then judge what the agent wrote.</h2>
              <p className="muted mt-8" style={{ fontSize: '13px', maxWidth: '640px' }}>
                A signup form accepts an email address. Right now <span className="mono">createUser()</span> trusts it completely.
                Your job: reject empty or malformed addresses, prove it with a test, and then decide whether the agent's
                refactor is safe to merge.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '18px 0' }}>
                <div className="task-step"><span className="num">1</span><div><b>Read the failing test.</b> It tells you the contract before you write a line.</div></div>
                <div className="task-step"><span className="num">2</span><div><b>Add the guard clause.</b> One condition, one clear error message.</div></div>
                <div className="task-step"><span className="num">3</span><div><b>Run the tests.</b> If they pass, review the agent's patch in 3.3.</div></div>
              </div>

              <div className="code">
                <div className="ln"><span className="no">1</span><span><span className="c">// users/create-user.ts</span></span></div>
                <div className="ln"><span className="no">2</span><span><span className="k">export function</span> <span className="f">createUser</span>(input: <span className="f">SignupInput</span>) {"{"}</span></div>
                <div className="ln hl"><span className="no">3</span><span>  <span className="c">// TODO: reject an empty or malformed email</span></span></div>
                <div className="ln"><span className="no">4</span><span>  <span className="k">const</span> user = {"{"} id: <span className="f">nextId</span>(), email: input.email {"}"};</span></div>
                <div className="ln"><span className="no">5</span><span>  <span className="k">return</span> user;</span></div>
                <div className="ln"><span className="no">6</span><span>{"}"}</span></div>
              </div>

              <div className="row mt-12">
                <button className="btn btn-primary btn-sm" id="runTests">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  Run tests
                </button>
                <button className="btn btn-sm" data-reveal="hint" data-done="Hint shown">Ask for a hint</button>
                <button className="btn btn-sm btn-ghost">Show solution</button>
                <span className="tiny muted" style={{ marginLeft: 'auto' }}>Press ⌘⏎ to run</span>
              </div>

              <div className="term mt-12" id="testResults">
                <div><span className="dim">$ npm test -- validation</span></div>
                <div><span className="ok">✓</span> rejects an empty email <span className="dim">(3 ms)</span></div>
                <div><span className="bad">✗</span> rejects an email without @ <span className="dim">(2 ms)</span></div>
                <div className="dim" style={{ paddingLeft: '14px' }}>expected 400 ValidationError, received 201</div>
                <div><span className="ok">✓</span> keeps a valid address untouched <span className="dim">(2 ms)</span></div>
                <div style={{ marginTop: '6px' }}><span className="bad">Tests: 2 passed, 1 failed</span> <span className="dim">· coverage 88% on users/</span></div>
              </div>

              <div className="hint-box mt-12" id="hint" hidden>
                <b>Hint 1 of 2.</b> Check the string before you build the object — <span className="mono">if (!input.email?.includes('@'))</span>.
                A guard clause returns early, so nothing downstream has to know about bad input.
              </div>
            </div>

            <div className="card-body" style={{ borderTop: '1px solid var(--line-2)', background: '#fbfbfd', borderRadius: '0 0 12px 12px' }}>
              <div className="between">
                <div className="tiny muted">Checkpoint 4 of 6 unlocks the design review role play.</div>
                <div className="row">
                  <button className="btn btn-sm">Back</button>
                  <button className="btn btn-sm btn-dark">Next: 3.3 Review patch →</button>
                </div>
              </div>
            </div>
          </div>

          <div className="card card-pad">
            <div className="between">
              <div className="eyebrow">What you just practised</div>
              <span className="pill pill-line">Traces to LO-3</span>
            </div>
            <div className="grid-3 mt-12" style={{ gap: '12px' }}>
              <div><div style={{ fontSize: '12.6px', fontWeight: '600' }}>Delegation</div><div className="tiny muted">You kept the contract, the agent wrote the plumbing.</div></div>
              <div><div style={{ fontSize: '12.6px', fontWeight: '600' }}>Discernment</div><div className="tiny muted">Passing tests are evidence, not proof of correctness.</div></div>
              <div><div style={{ fontSize: '12.6px', fontWeight: '600' }}>Diligence</div><div className="tiny muted">You will record what you accepted and why.</div></div>
            </div>
          </div>
        </div>


        <div className="stack">
          <div className="card">
            <div className="card-head">
              <div className="row"><span className="logo-mark sm" style={{ width: '19px', height: '19px', fontSize: '9px' }}>P</span><h3 style={{ fontSize: '12.5px' }}>AI tutor</h3></div>
              <span className="pill pill-line">grounded</span>
            </div>
            <div className="card-body">
              <div className="seg" style={{ width: '100%', marginBottom: '12px' }}>
                <button data-tutor="intro" className="on" style={{ flex: '1' }}>Plain</button>
                <button data-tutor="analogy" style={{ flex: '1' }}>Analogy</button>
                <button data-tutor="formal" style={{ flex: '1' }}>Formal</button>
              </div>

              <div className="tutor">
                <div className="tutor-msg">
                  <div id="tutorText">
                    A <b>validation rule</b> is a guard clause: it stops bad data before it reaches your database, so every
                    later bug you would have hunted is prevented once, up front. Here the agent should add the rule
                    <em>and</em> the test that proves it.
                  </div>
                  <div className="src" id="tutorFoot"><span>◈</span> Grounded in Lecture 03 §2.2 · Definition of Done checklist</div>
                </div>

                <div>
                  <div className="eyebrow" style={{ marginBottom: '7px' }}>Ask about this step</div>
                  <div className="wrap">
                    <button className="btn btn-sm">Why not validate in the DB?</button>
                    <button className="btn btn-sm">Show me the test first</button>
                  </div>
                </div>

                <div className="ask">
                  <span className="mono" style={{ fontSize: '11px' }}>/</span>
                  Ask anything about this lab…
                  <span style={{ marginLeft: 'auto', color: 'var(--muted-2)' }}>↵</span>
                </div>
              </div>
            </div>
            <div className="card-body" style={{ borderTop: '1px solid var(--line-2)', paddingTop: '11px' }}>
              <div className="tiny muted" style={{ lineHeight: '1.55' }}>
                The tutor only answers from this course's material. If it does not know, it says so —
                <span className="mono" style={{ fontSize: '10.5px' }}>docs/ai-usage-log.md</span> records every refusal.
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h3>Mastery</h3><span className="tiny muted">this module</span></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="between">
                <div style={{ fontSize: '12.6px' }}>Requirements</div>
                <div className="row"><span className="pill pill-teal">Solid</span><span className="tiny muted">3/3</span></div>
              </div>
              <div className="between">
                <div style={{ fontSize: '12.6px' }}>Working with an agent</div>
                <div className="row"><span className="pill pill-amber">Developing</span><span className="tiny muted">2/3</span></div>
              </div>
              <div className="between">
                <div style={{ fontSize: '12.6px' }}>Reviewing output</div>
                <div className="row"><span className="pill">Not started</span><span className="tiny muted">0/2</span></div>
              </div>
              <div className="divider"></div>
              <div className="tiny muted">Mastery moves only when you finish an activity — reading time alone does not count.</div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
