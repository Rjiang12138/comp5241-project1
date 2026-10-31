"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserById } from "@/lib/store";

/**
 * Demo sign-in.
 *
 * No password flow: the reviewer picks a role and the cookie names the user. It
 * is the same cookie a real provider will write, so replacing this with Clerk's
 * session in week 10 leaves every page untouched.
 *
 * Two things this does that it did not do before: it returns you to the page
 * that asked (`?next=`), and it sends you to a page your role can actually open
 * instead of always `/courses` — signing in as a learner used to land on a staff
 * route and bounce off the guard.
 */

const STAFF_ONLY = ["/studio", "/courses", "/insights", "/admin"];

/** Only a same-site path is worth returning to. */
function safeNext(value: string): string | null {
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (value === "/login" || value.startsWith("/login?")) return null;
  return value;
}

export async function signInAction(formData: FormData): Promise<void> {
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;

  const jar = await cookies();
  jar.set("praxis_uid", userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  const user = await getUserById(userId);
  const wanted = safeNext(String(formData.get("next") ?? ""));
  const home = user?.role === "learner" ? "/learn" : "/courses";
  const canOpen =
    wanted !== null &&
    (user?.role === "learner"
      ? !STAFF_ONLY.some(
          (prefix) => wanted === prefix || wanted.startsWith(`${prefix}/`) || wanted.startsWith(`${prefix}?`),
        )
      : true);

  redirect(canOpen && wanted ? wanted : home);
}

export async function signOutAction(): Promise<void> {
  const jar = await cookies();
  jar.delete("praxis_uid");
  redirect("/login");
}
