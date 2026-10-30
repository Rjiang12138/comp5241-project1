import Link from "next/link";
import { Shell } from "@/components/Shell";
import ResetDemoForm from "@/components/ResetDemoForm";
import { getSession } from "@/lib/auth";
import { resetDemoDataAction, saveProfileAction } from "./actions";
import { signOutAction } from "../login/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings — Praxis" };

/**
 * Account settings.
 *
 * Editable: the display name, because it is the one field the user owns and
 * every table reads it from the same row. Read-only: email, role and the
 * workspace defaults, each for a stated reason rather than "not built yet" —
 * the prototype's sidebar pointed Settings at "#", and a page that admits what
 * it will not do is better than a link that goes nowhere.
 */

function Row({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="between" style={{ padding: "11px 0", borderBottom: "1px solid var(--line-2)" }}>
      <div>
        <div style={{ fontSize: "12.6px", fontWeight: 600 }}>{label}</div>
        {hint ? <div className="tiny muted">{hint}</div> : null}
      </div>
      <div style={{ fontSize: "12.6px", color: "var(--ink-2)" }}>{value}</div>
    </div>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; profile?: string }>;
}) {
  const session = await getSession();
  const { reset, profile } = await searchParams;

  return (
    <Shell
      session={session}
      active="settings"
      crumb={
        <>
          <span>Workspace</span>
          <span className="sep">/</span>
          <b>Settings</b>
        </>
      }
      actions={
        <Link className="btn btn-sm" href={session.role === "learner" ? "/learn" : "/courses"}>
          {session.role === "learner" ? "Back to my learning" : "Back to courses"}
        </Link>
      }
    >
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Account and workspace defaults for the signed-in user.</p>
        </div>
      </div>

      {profile === "saved" ? (
        <div
          className="card card-pad"
          style={{ background: "#f3fbf6", borderColor: "#c8ecd6", marginBottom: "14px" }}
          role="status"
        >
          <div className="eyebrow" style={{ color: "#0f7a4a" }}>
            Name saved
          </div>
          <div style={{ fontSize: "12.5px", marginTop: "6px", lineHeight: 1.6 }}>
            Every table that shows your name reads it from the same row, so the change is already visible on the
            courses you own.
          </div>
        </div>
      ) : null}

      {profile === "short" ? (
        <div
          className="card card-pad"
          style={{ background: "#fffdf5", borderColor: "#fde9c8", marginBottom: "14px" }}
          role="status"
        >
          <div className="eyebrow" style={{ color: "#b45309" }}>
            Name not saved
          </div>
          <div style={{ fontSize: "12.5px", marginTop: "6px", lineHeight: 1.6 }}>
            A display name needs at least two characters. Nothing was changed.
          </div>
        </div>
      ) : null}

      {reset === "done" ? (
        <div
          className="card card-pad"
          style={{ background: "#f3fbf6", borderColor: "#c8ecd6", marginBottom: "14px" }}
          role="status"
        >
          <div className="eyebrow" style={{ color: "#0f7a4a" }}>
            Demo data restored
          </div>
          <div style={{ fontSize: "12.5px", marginTop: "6px", lineHeight: 1.6 }}>
            6 courses · 20 modules · 22 activities · 24 learners. Every table was cleared and re-inserted, so
            anything you renamed or deleted is back to the fixture.
          </div>
        </div>
      ) : null}

      {reset === "unconfirmed" ? (
        <div
          className="card card-pad"
          style={{ background: "#fffdf5", borderColor: "#fde9c8", marginBottom: "14px" }}
          role="status"
        >
          <div className="eyebrow" style={{ color: "#b45309" }}>
            Nothing was reset
          </div>
          <div style={{ fontSize: "12.5px", marginTop: "6px", lineHeight: 1.6 }}>
            The confirmation word was not typed, so the request was ignored. Nothing was deleted.
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 330px", gap: "16px", alignItems: "start" }}>
        <div className="stack">
          <div className="card">
            <div className="card-head">
              <h3>Account</h3>
              <span className="pill pill-line">{session.role}</span>
            </div>
            <div className="card-body" style={{ paddingTop: "6px" }}>
              <div className="row" style={{ padding: "10px 0 14px", gap: "11px" }}>
                <span className="avatar" style={{ width: "38px", height: "38px", fontSize: "13px" }}>
                  {session.initials}
                </span>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 600 }}>{session.name}</div>
                  <div className="tiny muted">{session.label}</div>
                </div>
                <span className={session.role === "admin" ? "pill pill-amber" : "pill pill-brand"} style={{ marginLeft: "auto" }}>
                  {session.role === "admin" ? "Admin" : session.role === "instructor" ? "Instructor" : "Learner"}
                </span>
              </div>

              <form action={saveProfileAction}>
                <div className="field">
                  <label htmlFor="name">Display name</label>
                  <div className="row">
                    <input className="input" id="name" name="name" defaultValue={session.name} />
                    <button className="btn btn-sm" type="submit">
                      Save
                    </button>
                  </div>
                  <div className="hint">Shown on courses you own and in the cohort tables.</div>
                </div>
              </form>

              <Row label="Email" value={<span className="mono">{session.email}</span>} hint="Used as the sign-in identity" />
              <Row
                label="Role"
                value={session.role}
                hint="Controls which shell and which routes you can open"
              />
              <div style={{ paddingTop: "14px" }}>
                <Link className="btn btn-sm" href="/login">
                  Switch role
                </Link>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Workspace defaults</h3>
              <span className="pill pill-line">fixed for this build</span>
            </div>
            <div className="card-body" style={{ paddingTop: "6px" }}>
              <Row label="Term" value="2026/27 S1" hint="Applied to new cohorts and generated courses" />
              <Row label="Default audience" value="Mixed cohort" hint="The generation prompt starts here" />
              <Row label="Language" value="English" hint="Learner-facing copy is English only; switching languages is not built" />
              <Row label="Cohort import" value="CSV roster" hint="Paste a roster on the course page; Moodle export columns are accepted as-is" />
              <div className="footnote" style={{ marginTop: "12px" }}>
                These are single-workspace values, not per-user preferences: one deployment, one term, one language.
                Making them editable per workspace is the change to make if Praxis is ever used by two departments.
              </div>
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-head">
              <h3>Session</h3>
            </div>
            <div className="card-body">
              <p className="tiny muted" style={{ lineHeight: 1.6 }}>
                This build signs you in with a cookie that names a demo user — no password, no signature. Every
                route reads the role off that cookie on the server, so the access rules are real even though the
                credential is not.
              </p>
              <form action={signOutAction} style={{ marginTop: "12px" }}>
                <button className="btn btn-sm" type="submit" style={{ width: "100%", justifyContent: "center" }}>
                  Sign out
                </button>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Demo data</h3>
              <span className={session.role === "admin" ? "pill pill-line" : "pill pill-amber"}>
                {session.role === "admin" ? "admin only" : "admins only"}
              </span>
            </div>
            <div className="card-body">
              <p className="tiny muted" style={{ lineHeight: 1.6 }}>
                Clears every table and re-inserts the fixture: 6 courses, 20 modules, 22 activities, 24
                learners. Use it between demos, after someone has renamed or deleted things.
              </p>
              {session.role === "admin" ? (
                <>
                  <ResetDemoForm action={resetDemoDataAction} />
                  <div className="footnote" style={{ marginTop: "8px" }}>
                    Type RESET to enable the button. The schema is not touched — only the rows. Expect a few
                    seconds: the database is in another region.
                  </div>
                </>
              ) : (
                <div className="footnote" style={{ marginTop: "8px" }}>
                  Sign in as A. Tse to run this. The same reset is available from a terminal as{" "}
                  <span className="mono">npm run db:reset</span>.
                </div>
              )}
            </div>
          </div>

          <div className="card card-pad" style={{ background: "#fffdf5", borderColor: "#fde9c8" }}>
            <div className="eyebrow" style={{ color: "#b45309" }}>
              What is not here
            </div>
            <div style={{ fontSize: "12.5px", marginTop: "6px", lineHeight: 1.6 }}>
              Email and role are read-only because they are the identity the session was created with — changing
              your own role from this page would be a permission bug with a friendly label. Workspace defaults are
              fixed for the same reason: one term, one language, one deployment.
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
