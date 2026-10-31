import { FORMAT_LABEL } from "@/lib/activity-content";
import { courseAnalytics, courseWithMostLearners, getCourse, listCourses, listPublishedCourses } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Praxis — AI course studio for software engineering",
};

/**
 * The landing page, rewritten to show the product instead of a picture of it.
 *
 * It was rendered from `prototype/index.html`, which meant the "Draft outline"
 * card in the hero listed the five modules of one course by hand and floated a
 * completion figure typed into the markup. Both are now read from the database:
 * the card shows the modules of whichever course the cohort is actually using,
 * and the figure beside it is the number `/insights` prints.
 *
 * The copy is also allowed to be checked. "No sign-up" was there because the
 * prototype had no sign-in; the app has one, so the line now says what it does.
 */
export default async function HomePage() {
  const [courseId, courses, published] = await Promise.all([
    courseWithMostLearners(),
    listCourses(),
    listPublishedCourses(),
  ]);
  const [course, analytics] = await Promise.all([
    courseId ? getCourse(courseId) : Promise.resolve(null),
    courseId ? courseAnalytics(courseId, null) : Promise.resolve(null),
  ]);

  const shown = course?.modules.slice(0, 4) ?? [];
  const remaining = (course?.modules.length ?? 0) - shown.length;

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
          <a className="btn btn-ghost btn-sm" href="/login">Sign in</a>
          <a className="btn btn-primary btn-sm" href="/studio">Open the studio</a>
        </div>
      </nav>

      <header className="mk-hero">
        <div>
          <span className="pill pill-brand"><span className="dot" /> COMP5241 · Praxis</span>
          <h1>Turn lecture material into <em>interactive mini-courses</em>.</h1>
          <p className="mk-lede">
            Praxis is a GenAI course studio for software engineering education. Instructors bring a topic
            or a slide deck; Praxis drafts the modules, writes the activities — code labs, role plays,
            simulations — and keeps adapting to each learner&apos;s background.
          </p>
          <div className="mk-cta">
            <a className="btn btn-primary btn-lg" href="/studio">Open instructor studio <span className="kbd">⏎</span></a>
            <a className="btn btn-lg" href="/learn">See the learner view</a>
          </div>
          <div className="mk-note">
            <span className="pill pill-line">{published.length} published courses</span>
            Runs on Postgres · pick a demo identity on the sign-in page
          </div>
        </div>

        <div className="preview-wrap">
          <div className="preview">
            <div className="preview-bar">
              <i /><i /><i />
              <span>praxis.app/courses/{course?.id ?? "new"}</span>
            </div>
            <div className="preview-body">
              <div className="preview-title">
                <div>
                  <div className="eyebrow">{course ? "Live course" : "No course yet"}</div>
                  <strong style={{ fontSize: "14px" }}>{course?.title ?? "Nothing published"}</strong>
                </div>
                <span className="pill pill-teal">{course ? `${course.modules.length} modules` : "0 modules"}</span>
              </div>

              {shown.map((module, index) => {
                const first = module.activities[0];
                return (
                  <div className="preview-row" key={module.id}>
                    <span className="idx">{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <strong>{module.title}</strong>
                      <div className="tiny muted">
                        {first ? `${FORMAT_LABEL[first.format]} · ${first.minutes} min` : "No activity yet"}
                      </div>
                    </div>
                    {first ? <span className="tag">{FORMAT_LABEL[first.format]}</span> : null}
                  </div>
                );
              })}

              {remaining > 0 ? (
                <div className="preview-row" style={{ borderStyle: "dashed", background: "#fbfbfd" }}>
                  <span className="idx">+</span>
                  <div>
                    <strong style={{ color: "#667085" }}>{remaining} more {remaining === 1 ? "module" : "modules"}</strong>
                  </div>
                  <span className="tag">in the course</span>
                </div>
              ) : null}

              {shown.length === 0 ? (
                <div className="tiny muted" style={{ padding: "10px 0" }}>
                  Generate a course in the studio and it will appear here.
                </div>
              ) : null}
            </div>
          </div>

          {/* These two were absolutely positioned "floating" cards in the
              prototype, which worked because the card beside them was a fixed
              height. Now the card lists a real course, so its height depends on
              how many modules that course has — and the floats started covering
              the module-count pill. In normal flow they cannot collide. */}
          <div className="row" style={{ marginTop: "12px", gap: "10px", alignItems: "stretch" }}>
            <div className="float-card" style={{ position: "static", flex: "1 1 0" }}>
              <div className="tiny muted">Average progress</div>
              <div style={{ fontSize: "19px", fontWeight: "650", letterSpacing: "-.02em", margin: "1px 0 6px" }}>
                {analytics ? `${analytics.averageProgress}%` : "—"}
              </div>
              <div className="progress" style={{ height: "5px" }}>
                <i style={{ width: `${analytics?.averageProgress ?? 0}%` }} />
              </div>
              <div className="tiny muted" style={{ marginTop: "4px" }}>
                {analytics ? `${analytics.learners} enrolled` : "no course published"}
              </div>
            </div>
            <div className="float-card" style={{ position: "static", flex: "0 0 auto" }}>
              <div className="tiny muted" style={{ marginBottom: "2px" }}>Adapted for</div>
              <div style={{ display: "flex", gap: "4px", marginTop: "5px" }}>
                <span className="pill pill-brand" style={{ height: "21px" }}>Non-CS</span>
                <span className="pill pill-line" style={{ height: "21px" }}>CS</span>
              </div>
            </div>
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
          <h3>Generate, don&apos;t author from scratch</h3>
          <p>Describe the topic, audience and length. Praxis drafts learning objectives, module flow and an assessment plan you can edit line by line.</p>
        </div>
        <div className="feature">
          <div className="feature-ico" style={{ background: "#ecfdf5", color: "#0f766e" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
              <path d="M4 7h16M4 12h10M4 17h6" /><circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <h3>Adapt to who is actually learning</h3>
          <p>One course, two voices: a non-CS learner gets the analogy and the &quot;why&quot;; a CS graduate gets the contract, the invariant and the failure modes.</p>
        </div>
        <div className="feature">
          <div className="feature-ico" style={{ background: "#fffaeb", color: "#b45309" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
              <path d="M4 19V5M4 19h16" /><path d="M8 15l4-5 3 3 4-6" />
            </svg>
          </div>
          <h3>See where learners get stuck</h3>
          <p>Every activity reports completion, attempts and time on task — so the next revision is driven by evidence instead of instinct.</p>
        </div>
      </section>

      <div className="mk-strip">
        <div><b>{courses.length} courses</b> in the workspace</div>
        <div><b>3 roles</b> instructor · learner · admin</div>
        <div><b>GenAI</b> delegated, described, discerned, documented</div>
        <div style={{ marginLeft: "auto" }} className="sm">PolyU · Education 4.0 · COMP5241 Software Engineering</div>
      </div>
    </>
  );
}
