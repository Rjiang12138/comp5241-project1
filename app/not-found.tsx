import Link from "next/link";

/**
 * A 404 that still looks like Praxis.
 *
 * The app has no catch-all route, so a mistyped course id used to fall through
 * to the framework's own page. That reads like the deployment is broken rather
 * than the link.
 */
export const metadata = { title: "Not found — Praxis" };

export default function NotFound() {
  return (
    <div className="signin-wrap">
      <div className="signin" style={{ maxWidth: "560px" }}>
        <div className="mk-brand" style={{ marginBottom: "18px" }}>
          <span className="logo-mark">P</span> Praxis
        </div>

        <div className="card card-pad">
          <h1 style={{ fontSize: "18px", marginBottom: "6px" }}>No such page</h1>
          <p className="muted" style={{ fontSize: "13px", lineHeight: 1.6 }}>
            The link points at a course or a screen that does not exist. Course ids look like
            <code> c-sef</code>; everything else lives in the sidebar.
          </p>

          <div className="row" style={{ marginTop: "16px", gap: "8px" }}>
            <Link className="btn btn-sm btn-primary" href="/courses">
              My courses
            </Link>
            <Link className="btn btn-sm" href="/">
              Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
