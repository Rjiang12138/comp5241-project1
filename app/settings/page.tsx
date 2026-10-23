import Link from "next/link";
import { Shell } from "@/components/Shell";
import ResetDemoForm from "@/components/ResetDemoForm";
import { getSession } from "@/lib/auth";
import { resetDemoDataAction } from "./actions";
import { signOutAction } from "../login/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings — Praxis" };

/**
 * Account settings.
 *
 * Deliberately read-only. The prototype's sidebar had a Settings item pointing
 * at "#", which reads as a broken link during a demo. Rather than invent a
 * settings surface nobody asked for, this shows what the session actually knows
 * and says plainly which parts are not editable yet — the honest version of a
 * page that does not exist.
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

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const session = await getSession();
  const { reset } = await searchParams;

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
        <Link className="btn btn-sm" href="/courses">
          Back to courses
        </Link>
      }
    >
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Account and workspace defaults for the signed-in user.</p>
        </div>
      </div>

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
              <span className="pill pill-line">read only</span>
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
                  {session.role === "admin" ? "Admin" : "Instructor"}
                </span>
              </div>
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
              <span className="pill pill-amber">not editable yet</span>
            </div>
            <div className="card-body" style={{ paddingTop: "6px" }}>
              <Row label="Term" value="2026/27 S1" hint="Applied to new cohorts and generated courses" />
              <Row label="Default audience" value="Mixed cohort" hint="The generation prompt starts here" />
              <Row label="Language" value="EN · 繁中 · 简中" hint="Learner-facing copy, not the instructor UI" />
              <Row label="Cohort import" value="Moodle · CSV" hint="Roster source for a new class" />
              <div className="footnote" style={{ marginTop: "12px" }}>
                These become editable per workspace in week 10. Until then they are the values every new course
                starts from, listed here so you can see what the platform assumes.
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
                This build signs you in as a demo user with a cookie — no password, no signature. The Clerk
                integration replaces this in week 10 and keeps the same session shape.
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
              Known gap
            </div>
            <div style={{ fontSize: "12.5px", marginTop: "6px", lineHeight: 1.6 }}>
              Your name, email, role and the workspace defaults are read-only. Only the demo reset above
              changes anything. Editing the account is a week 11 task if it survives scope review.
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
