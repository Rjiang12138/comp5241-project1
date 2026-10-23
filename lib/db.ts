import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton.
 *
 * Next.js reloads modules on every hot update in development, and serverless
 * functions are frozen rather than shut down. Without a singleton both cases
 * open a new pool per reload/invocation and exhaust the database's connection
 * limit. Caching on globalThis is the documented fix.
 *
 * Driver choice: the app runs in the Node.js runtime (server actions and server
 * components), not Edge. Neon's pooled connection string is already PgBouncer in
 * transaction mode, which is exactly what Prisma's query engine needs, so the
 * plain client is the right tool here. If a route ever moves to the Edge runtime,
 * switch to `@prisma/adapter-neon` + `@neondatabase/serverless` — the store's
 * signatures would not change.
 */

const globalForPrisma = globalThis as unknown as { __praxisPrisma?: PrismaClient };

export const prisma =
  globalForPrisma.__praxisPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.__praxisPrisma = prisma;
