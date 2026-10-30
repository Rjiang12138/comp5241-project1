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

/**
 * Errors that mean "the connection is gone", not "the query is wrong".
 *
 * Neon suspends an idle branch and closes its side of the pool while Prisma is
 * still holding the sockets. From then on every query fails with P1001 even
 * though the database is healthy again — the pool never notices. That is the
 * state this app sat in twice: the log said "can't reach database server" while
 * a one-off script against the same URL answered in two seconds.
 */
const CONNECTION_LOST = new Set(["P1001", "P1002", "P1017"]);

function createClient(): PrismaClient {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  /**
   * Drop the dead pool and try once more.
   *
   * Deliberately once. A retry loop would hide a real outage behind a spinner,
   * and the error boundary exists precisely so a genuine failure says so and
   * offers the reader a way back. One retry covers the case that actually
   * happens: the branch woke up while the request was in flight.
   */
  const extended = base.$extends({
    query: {
      async $allOperations({ args, query }) {
        try {
          return await query(args);
        } catch (error) {
          const code = (error as { code?: string }).code;
          if (!code || !CONNECTION_LOST.has(code)) throw error;
          await base.$disconnect().catch(() => {});
          return query(args);
        }
      },
    },
  });

  // The extension is a runtime wrapper; the public type stays PrismaClient so
  // every existing call site and `Prisma.TransactionClient` keeps working.
  return extended as unknown as PrismaClient;
}

const globalForPrisma = globalThis as unknown as { __praxisPrisma?: PrismaClient };

export const prisma = globalForPrisma.__praxisPrisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.__praxisPrisma = prisma;
