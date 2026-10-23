"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { seedDemoData } from "@/lib/demo-data";

/**
 * Restore the demo fixture — the button form of `npm run db:reset`.
 *
 * Two deliberate differences from the npm script:
 *
 *  1. No `prisma db push --force-reset`. That drops and recreates the schema.
 *     A request handler has no business running DDL, and dropping tables is not
 *     something a mis-click should be able to do. This clears rows and
 *     re-inserts them; the schema is left alone.
 *  2. Admin only, plus a typed confirmation. The npm script is run by a person
 *     who typed a command; a button is one stray click away from a demo with no
 *     data in it.
 *
 * Ends in a redirect rather than returning state. The action takes several
 * seconds (the database is in another region), and returning a value to
 * `useActionState` left the button spinning forever: the action finished, but
 * the response carrying its return value never reached the browser. A redirect
 * is a plain 303 that the browser follows, so the result is visible whether or
 * not JavaScript is running.
 */
export async function resetDemoDataAction(formData: FormData) {
  await requireRole("admin");

  const typed = String(formData.get("confirm") ?? "").trim().toUpperCase();
  if (typed !== "RESET") {
    redirect("/settings?reset=unconfirmed");
  }

  await seedDemoData(prisma);

  redirect("/settings?reset=done");
}
