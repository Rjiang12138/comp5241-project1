import Link from "next/link";
import type { ReactNode } from "react";
import type { Session } from "@/lib/auth";
import { cohortsHref } from "@/lib/nav";

/**
 * The application shell.
 *
 * Markup is copied from prototype/course.html so a screen built here and a
 * screen still rendered from the prototype look identical side by side. The
 * only addition is the Admin entry, which appears for the admin role because
 * the brief's third role had no home in the mid-term prototype.
 */

export type NavKey = "studio" | "courses" | "insights" | "cohorts" | "paths" | "preview" | "settings" | "admin";

const ICONS: Record<NavKey, ReactNode> = {
  studio: (
    <>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
      <circle cx="12" cy="12" r="3.2" />
    </>
  ),
  courses: (
    <>
      <path d="M4 5.5A2.5 2.5 0 016.5 3H19v18H6.5A2.5 2.5 0 014 18.5z" />
      <path d="M8 3v18" />
    </>
  ),
  insights: (
    <>
      <path d="M4 19V5M4 19h16" />
      <path d="M8 15l3.5-4.5L15 13l4-6" />
    </>
  ),
  cohorts: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <path d="M16 11a3 3 0 100-6" />
    </>
  ),
  paths: (
    <>
      <path d="M4 6h6M4 12h10M4 18h6" />
      <circle cx="17" cy="17" r="3" />
    </>
  ),
  preview: (
    <>
      <path d="M4 5.5A2.5 2.5 0 016.5 3H19v18H6.5A2.5 2.5 0 014 18.5z" />
      <path d="M9 9h6M9 13h4" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="15" cy="7" r="2.2" />
      <circle cx="9" cy="17" r="2.2" />
    </>
  ),
  admin: (
    <>
      <path d="M12 3l7 3v6c0 4.2-2.9 7.4-7 9-4.1-1.6-7-4.8-7-9V6z" />
      <path d="M9.2 12l2 2 3.6-3.8" />
    </>
  ),
};

function Icon({ name }: { name: NavKey }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      {ICONS[name]}
    </svg>
  );
}

function NavLink({ name, href, label, active, count }: { name: NavKey; href: string; label: string; active?: boolean; count?: string }) {
  return (
    <Link href={href} className={active ? "active" : undefined}>
      <Icon name={name} />
      {label}
      {count ? <span className="count">{count}</span> : null}
    </Link>
  );
}

export function Sidebar({ session, active, courseCount }: { session: Session; active: NavKey; courseCount?: number }) {
  return (
    <aside className="sidebar">
      <div className="side-brand">
        <span className="logo-mark sm">P</span> Praxis <span className="pill pill-line">beta</span>
      </div>
      <nav className="side-nav">
        {/* A learner sees a learner's sidebar. Hiding the staff links is not the
            access control — every staff route calls requireStaff() on the server
            — but a menu full of doors that open onto a redirect is its own kind
            of lie. */}
        {session.role === "learner" ? (
          <>
            <NavLink name="preview" href="/learn" label="My learning" active={active === "preview"} />
            <NavLink name="paths" href="/path" label="My path" active={active === "paths"} />
            <div className="side-label">Account</div>
            <NavLink name="settings" href="/settings" label="Settings" active={active === "settings"} />
          </>
        ) : (
          <>
            <NavLink name="studio" href="/studio" label="Studio" active={active === "studio"} />
            <NavLink name="courses" href="/courses" label="My courses" active={active === "courses" || active === "cohorts"} count={courseCount ? String(courseCount) : undefined} />
            <NavLink name="insights" href="/insights" label="Insights" active={active === "insights"} />
            {/* In the prototype "Cohorts" pointed at course.html, so it opened the
                catalogue instead of a cohort screen. cohortsHref() decides where it
                goes per role; see lib/nav.ts. */}
            <NavLink
              name="cohorts"
              href={cohortsHref(session)}
              label="Cohorts"
              active={false}
              count="2"
            />

            <div className="side-label">Workspace</div>
            <NavLink name="paths" href="/path" label="Learner paths" active={active === "paths"} />
            <NavLink name="preview" href="/learn" label="Preview as learner" active={active === "preview"} />
            <NavLink name="settings" href="/settings" label="Settings" active={active === "settings"} />
            {session.role === "admin" ? <NavLink name="admin" href="/admin" label="Admin" active={active === "admin"} /> : null}
          </>
        )}
      </nav>
      <div className="side-foot">
        <Link className="side-user" href="/login">
          <span className="avatar">{session.initials}</span>
          <div style={{ lineHeight: 1.25 }}>
            <div style={{ fontSize: "12.5px", fontWeight: 600 }}>{session.name}</div>
            <div className="tiny muted">{session.label}</div>
          </div>
        </Link>
      </div>
    </aside>
  );
}

export function Topbar({ crumb, actions }: { crumb: ReactNode; actions?: ReactNode }) {
  return (
    <div className="topbar">
      <div className="crumb">{crumb}</div>
      <div className="topbar-right">{actions}</div>
    </div>
  );
}

export function Shell({
  session,
  active,
  crumb,
  actions,
  courseCount,
  children,
}: {
  session: Session;
  active: NavKey;
  crumb: ReactNode;
  actions?: ReactNode;
  courseCount?: number;
  children: ReactNode;
}) {
  return (
    <div className="shell">
      <Sidebar session={session} active={active} courseCount={courseCount} />
      <main>
        <Topbar crumb={crumb} actions={actions} />
        <div className="page">{children}</div>
      </main>
    </div>
  );
}
