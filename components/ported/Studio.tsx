// Generated from prototype/studio.html by tools/html_to_tsx.py.
// Markup is copied verbatim from the mid-term prototype. Do not restyle here:
// change prototype/css/styles.css and re-run the converter instead.
//
// One hand edit, marked here so a re-run of the converter does not lose it: the
// three-column body (source material / brief / draft outline / generation log)
// is now `components/StudioWorkspace.tsx`, because those three columns are one
// piece of state and cannot be three static blocks. Everything above it — the
// shell, the sidebar, the topbar, the page head — is untouched.

import SideUser from "@/components/SideUser";
import StudioWorkspace from "@/components/StudioWorkspace";
import { cohortsHref } from "@/lib/nav";
import type { Session } from "@/lib/auth";

export default function Studio({
  session,
  model,
  draft,
}: {
  session: Session;
  model: string;
  draft: { id: string; title: string; status: string; when: string } | null;
}) {
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
              {draft ? (
                <span className="pill pill-line">
                  <span className="dot" style={{ background: "#12b76a" }}></span> Saved {draft.when}
                </span>
              ) : (
                <span className="pill pill-line">
                  <span className="dot" style={{ background: "#98a2b3" }}></span> Nothing saved yet
                </span>
              )}
              <a className="btn btn-sm" href={draft ? `/courses/${draft.id}` : "/courses"}>
                {draft ? "Open editor" : "All courses"}
              </a>
              <a className="btn btn-primary btn-sm" href={draft ? `/courses/${draft.id}` : "/courses"}>
                {draft ? "Review & publish" : "New course"}
              </a>
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
                <span className="pill pill-line">Model: {model}</span>
              </div>
            </div>

            <StudioWorkspace />

          </div>
        </main>
      </div>
    </>
  );
}
