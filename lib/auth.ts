import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role, User } from "./types";
import { listSignableUsers } from "./store";

/**
 * Session handling.
 *
 * Week 9 uses a signed-in-by-default demo session: opening the app lands you as
 * Dr. R. Kwok, the instructor the prototype was drawn around, so reviewers do
 * not have to create an account to look at anything. The role switcher in the
 * sidebar writes the same cookie a real sign-in would.
 *
 * Week 10 replaces the body of getSession() with Clerk's `auth()` (see
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

export async function getSession(): Promise<Session> {
  const jar = await cookies();
  const uid = jar.get(COOKIE)?.value;
  // Every role is resolvable, learners included: `/learn` is only honest if the
  // session behind it can actually be a learner. The default is still the
  // instructor the prototype was drawn around, so a reviewer who opens the app
  // cold lands in the staff shell.
  const users = await listSignableUsers();
  const fallback = users.find((u) => u.id === DEMO_INSTRUCTOR) ?? users[0];
  if (!uid) return toSession(fallback);
  const match = users.find((u) => u.id === uid);
  return toSession(match ?? fallback);
}

/** Server-side guard. Pages call this instead of trusting the UI. */
export async function requireRole(role: Role): Promise<Session> {
  const session = await getSession();
  if (session.role !== role) redirect("/login");
  return session;
}

export async function isAdmin(): Promise<boolean> {
  return (await getSession()).role === "admin";
}
