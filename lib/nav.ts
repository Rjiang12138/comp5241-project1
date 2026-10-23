import type { Session } from "./auth";

/**
 * Where the sidebar's "Cohorts" item should go.
 *
 * The prototype pointed this at course.html, which the route map sends to the
 * course catalogue — so the item never opened a cohort screen. Cohorts is an
 * admin-only page in this build; an instructor is sent to their course editor
 * rather than to /admin, where the role guard would bounce them to the login
 * page and look like a dead button.
 *
 * Kept in one place because the sidebar is rendered both by components/Shell
 * (hand-written pages) and by the ported screens, which the converter rewrites
 * to call this helper.
 */
export function cohortsHref(session: Session): string {
  return session.role === "admin" ? "/admin" : "/courses/c-sef";
}
