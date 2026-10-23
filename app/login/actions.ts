"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Demo sign-in.
 *
 * Week 9 has no password flow: the reviewer picks a role and the cookie names
 * the user. It is the same cookie a real provider will write, so replacing this
 * with Clerk's session in week 10 leaves every page untouched.
 */

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
  redirect("/courses");
}

export async function signOutAction(): Promise<void> {
  const jar = await cookies();
  jar.delete("praxis_uid");
  redirect("/login");
}
