"use client";

/**
 * The route-level error boundary.
 *
 * Every screen in this app is a query — progress is read from `events`, the
 * cohort table from enrolments, the editor from the course tree. There is no
 * cached copy to fall back on, so when Postgres cannot be reached the honest
 * answer is "the data is not here right now", not a blank card with zeros.
 *
 * That happens for ordinary reasons: the Neon branch suspends after a few idle
 * minutes, and the first request after that can time out while the compute
 * wakes. A second attempt usually works, which is why the primary action is a
 * retry rather than a reload of the whole app.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const offline = /P1001|Can't reach database|ECONNREFUSED|ETIMEDOUT|fetch failed/i.test(
    `${error.message}`,
  );

  return (
    <div className="signin-wrap">
      <div className="signin" style={{ maxWidth: "560px" }}>
        <div className="mk-brand" style={{ marginBottom: "18px" }}>
          <span className="logo-mark">P</span> Praxis
        </div>

        <div className="card card-pad">
          <h1 style={{ fontSize: "18px", marginBottom: "6px" }}>
            {offline ? "The database did not answer" : "This page could not load"}
          </h1>
          <p className="muted" style={{ fontSize: "13px", lineHeight: 1.6 }}>
            {offline
              ? "Praxis reads everything live — there is no cached copy of your progress to show instead. The Postgres branch is probably still waking up, or the network dropped. Trying again usually works."
              : "Something threw while this page was being rendered. The detail is below; nothing was written to the database."}
          </p>

          <div
            style={{
              marginTop: "14px",
              padding: "10px 12px",
              border: "1px solid var(--line-2)",
              borderRadius: "var(--radius)",
              background: "var(--bg-2, #faf9f7)",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: "11.5px",
              lineHeight: 1.5,
              color: "var(--ink-2, #55524d)",
              wordBreak: "break-word",
            }}
          >
            {offline
              ? "PrismaClientKnownRequestError · P1001 · Can't reach database server"
              : error.message.slice(0, 240)}
            {error.digest ? <div className="tiny muted" style={{ marginTop: "6px" }}>digest {error.digest}</div> : null}
          </div>

          <div className="row" style={{ marginTop: "16px", gap: "8px" }}>
            <button className="btn btn-sm btn-primary" onClick={() => reset()} type="button">
              Try again
            </button>
            <a className="btn btn-sm" href="/courses">
              My courses
            </a>
            <a className="btn btn-sm btn-ghost" href="/learn">
              Learner view
            </a>
          </div>
        </div>

        <p className="tiny muted" style={{ marginTop: "12px", lineHeight: 1.6 }}>
          If this repeats, the connection string in <code>.env.local</code> is the thing to check
          (<code>DATABASE_URL</code> and <code>DATABASE_URL_UNPOOLED</code>), then{" "}
          <code>npm run db:push</code>.
        </p>
      </div>
    </div>
  );
}
