import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role, User } from "./types";
import { getUserById, listSignableUsers } from "./store";

/**
 * Session handling.
 *
 * There is no password flow: the sign-in page lists demo identities and picking
 * one writes the same cookie a real provider would write. Every page that draws
 * a person's name asks `requireUser()` first, so opening a deep link cold shows
 * the picker instead of silently becoming Dr. R. Kwok — the app used to do the
 * latter, and a reviewer reasonably read it as "I am logged in as someone else".
 *
 * Week 10 replaces the body of getSessionOrNull() with Clerk's `auth()` (see
 * docs/architecture.md §2). Everything downstream already speaks `Session`, so
 * the swap does not touch a single page.
 */

const COOKIE = "praxis_uid";
export const DEMO_INSTRUCTOR = "u-kwok";

export interface Session {
  userId: string;
  name: string;
  email: string;
  role: Role;
  initials: string;
  label: string;
}

function toSession(user: User): Session {
  const initials = user.name
    .replace(/^(Dr\.|Prof\.|Mr\.|Ms\.)\s*/i, "")
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const label =
    user.role === "instructor" ? `Instructor · ${user.email.endsWith("polyu.edu.hk") ? "COMP" : "PolyU"}` : user.role === "admin" ? "Registry · Admin" : "Learner";

  return { userId: user.id, name: user.name, email: user.email, role: user.role, initials, label };
}

/** The demo roster the sign-in page offers. */
export async function switchableUsers(): Promise<Session[]> {
  return (await listSignableUsers()).map(toSession);
}

/**
 * The person behind the cookie, or null when nobody has signed in.
 *
 * The difference from `getSession()` matters. Actions need a session to work
 * with and a cold visit should not crash, so `getSession()` falls back to the
 * demo instructor. A page that prints a name, a path or a course list must not
 * invent one — `requireUser()` is the page-level answer.
 */
export async function getSessionOrNull(): Promise<Session | null> {
  const jar = await cookies();
  const uid = jar.get(COOKIE)?.value;
  if (!uid) return null;
  const user = await getUserById(uid);
  return user ? toSession(user) : null;
}

/** Session for actions; a cold visit resolves to the demo instructor. */
export async function getSession(): Promise<Session> {
  return (await getSessionOrNull()) ?? toSession(await demoUser());
}

/** The signed-in-by-default identity, used for a cold visit and a stale cookie. */
async function demoUser(): Promise<User> {
  const users = await listSignableUsers();
  return users.find((u) => u.id === DEMO_INSTRUCTOR) ?? users[0];
}

/** `/login`, carrying where the reader was going and why they were stopped. */
function loginUrl(from?: string, need?: Role[]): string {
  const params = new URLSearchParams();
  if (from) params.set("next", from);
  if (need && !need.includes("learner")) {
    params.set("need", need.length === 1 && need[0] === "admin" ? "admin" : "staff");
  }
  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}

/**
 * A signed-in person, or the sign-in page with a way back.
 *
 * `from` is the route that asked, so signing in returns there instead of
 * dropping everyone on `/courses` regardless of what they clicked.
 */
export async function requireUser(from?: string): Promise<Session> {
  const session = await getSessionOrNull();
  if (!session) redirect(loginUrl(from));
  return session;
}

/**
 * Server-side guard. Pages call this instead of trusting the UI.
 *
 * Someone signed in as the wrong role is sent to the sign-in page with the
 * reason attached ("this page is for instructors"), not silently bounced to
 * their own home: a learner who pressed "Generate this course" needs to know
 * the action exists and needs a staff account, which a redirect to `/learn`
 * never told them.
 */
export async function requireRole(roles: Role[], from?: string): Promise<Session> {
  const session = await requireUser(from);
  if (!roles.includes(session.role)) redirect(loginUrl(from, roles));
  return session;
}

/** Instructor or admin — the screens that manage courses and cohorts. */
export async function requireStaff(from?: string): Promise<Session> {
  return requireRole(["instructor", "admin"], from);
}

export async function isAdmin(): Promise<boolean> {
  return (await getSession()).role === "admin";
}
