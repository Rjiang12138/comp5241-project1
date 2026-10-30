"use client";

/**
 * The route-level error boundary.
 *
 * Every screen in this app is a query — progress is read from `events`, the
 * cohort table from enrolments, the editor from the course tree. There is no
 * cached copy to fall back on, so when the read fails the honest answer is "the
 * data is not here right now", not a blank card full of zeros.
 *
 * One wrinkle worth recording: production builds redact the error message
 * ("The specific message is omitted in production builds"), so recognising a
 * dropped connection by reading `P1001` out of it only works in development.
 * The copy below therefore names the database as the likely cause without
 * claiming to know, and keeps the specific branch for when the message survives.
 * An earlier version asserted "The database did not answer" only inside that
 * branch — which meant the sentence users actually needed never appeared in the
 * build they were using.
 */
const REDACTED = /Server Components render/i;

const CONNECTION_LOST = /P1001|P1002|P1017|Can't reach database|ECONNREFUSED|ETIMEDOUT|fetch failed/i;

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message = error.message ?? "";
  const redacted = REDACTED.test(message);
  const offline = CONNECTION_LOST.test(message);

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
              : "Nothing was written, and your progress is safe. Every screen here is read live from Postgres, so there is no cached copy to fall back on: either the database did not answer — the branch may still be waking up — or something threw while the page was rendering. Trying again is the first thing to try."}
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
            {redacted ? (
              <>
                Server-side exception · message redacted in this build
                {error.digest ? <div style={{ marginTop: "6px" }}>digest {error.digest}</div> : null}
              </>
            ) : (
              <>
                {message.slice(0, 240) || "No message"}
                {error.digest ? <div style={{ marginTop: "6px" }}>digest {error.digest}</div> : null}
              </>
            )}
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
