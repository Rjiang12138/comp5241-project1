import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell } from "@/components/Shell";
import { getSession } from "@/lib/auth";
import { courseVersions, getCourse } from "@/lib/store";
import { diffSnapshots, parseSnapshot } from "@/lib/versions";

export const dynamic = "force-dynamic";

/**
 * Version history and diff.
 *
 * Two versions, side by side, computed from the snapshot stored at publish time.
 * A version list that only shows notes is a changelog the author writes about
 * themselves; this shows what actually changed in the tree.
 */

type Search = { from?: string; to?: string };

const KIND_PILL: Record<string, string> = {
  added: "pill pill-teal",
  removed: "pill pill-rose",
  renamed: "pill pill-amber",
  changed: "pill pill-brand",
};

export default async function VersionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Search>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const session = await getSession();
  const course = await getCourse(id);
  if (!course) notFound();

  const versions = await courseVersions(course.id);
  const snapshots = versions.map((version) => ({ ...version, parsed: parseSnapshot(version.snapshot) }));

  const toVersion = Number(query.to) || snapshots[0]?.version;
  const fromVersion = Number(query.from) || snapshots[1]?.version;
  const to = snapshots.find((version) => version.version === toVersion);
  const from = snapshots.find((version) => version.version === fromVersion);

  const changes = from?.parsed && to?.parsed ? diffSnapshots(from.parsed, to.parsed) : [];
  const missingSnapshot = (from && !from.parsed) || (to && !to.parsed);

  return (
    <Shell
      session={session}
      active="courses"
      crumb={
        <>
          <span>My courses</span>
          <span className="sep">/</span>
          <Link href={`/courses/${course.id}`}>{course.title}</Link>
          <span className="sep">/</span>
          <b>Versions</b>
        </>
      }
      actions={
        <Link className="btn btn-sm" href={`/courses/${course.id}`}>
          Back to editor
        </Link>
      }
    >
      <div className="page-head">
        <div>
          <h1>Version history</h1>
          <p>
            {course.code} · {versions.length} published version{versions.length === 1 ? "" : "s"} · current{" "}
            <span className="mono">v{course.version}</span>
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: "16px", alignItems: "start" }}>
        <div className="card">
          <div className="card-head">
            <div>
              <h3>
                {from && to ? `v${from.version} → v${to.version}` : "Nothing to compare yet"}
              </h3>
              <div className="tiny muted" style={{ marginTop: "2px" }}>
                {from && to
                  ? `${changes.length} change${changes.length === 1 ? "" : "s"} between the two most recent publishes`
                  : "Publish the course a second time and the diff appears here."}
              </div>
            </div>
            <span className="pill pill-line">computed from snapshots</span>
          </div>

          <div className="card-body">
            {missingSnapshot ? (
              <div className="tiny muted" style={{ lineHeight: 1.7 }}>
                This pair has no snapshot: the version was published before snapshots were stored. Publish again and
                the next comparison will be a real one.
              </div>
            ) : changes.length === 0 && from && to ? (
              <div className="tiny muted" style={{ lineHeight: 1.7 }}>
                The two versions are identical. Publishing twice without editing anything is a no-op, which is worth
                knowing before you tell a cohort to re-download.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                {changes.map((change, index) => (
                  <div className="between" key={index} style={{ alignItems: "flex-start", gap: "12px" }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="row" style={{ gap: "8px", flexWrap: "wrap" }}>
                        <span className={KIND_PILL[change.kind] ?? "pill"}>{change.kind}</span>
                        <span className="tiny muted">{change.scope}</span>
                      </div>
                      <div style={{ fontSize: "12.8px", marginTop: "4px" }}>
                        <b style={{ fontWeight: 600 }}>{change.where}</b>
                        {change.from ? <span className="muted"> · was “{change.from}”</span> : null}
                        {change.to ? <span> · now “{change.to}”</span> : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Published</h3>
            <span className="tiny muted">newest first</span>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {versions.length === 0 ? <div className="tiny muted">Never published.</div> : null}
            {snapshots.map((version) => {
              const isCurrent = version.version === course.version;
              const isTarget = to?.version === version.version;
              return (
                <div className="between" key={version.id} style={{ gap: "8px" }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="row" style={{ gap: "6px" }}>
                      <b style={{ fontWeight: 600 }}>v{version.version}</b>
                      {isCurrent ? <span className="pill pill-teal">current</span> : null}
                      {version.parsed ? null : <span className="pill pill-amber">no snapshot</span>}
                    </div>
                    <div className="tiny muted">{version.createdAt}</div>
                  </div>
                  <Link
                    className={`btn btn-sm${isTarget ? " btn-primary" : ""}`}
                    href={`/courses/${course.id}/versions?to=${version.version}&from=${Math.max(1, version.version - 1)}`}
                  >
                    {isTarget ? "showing" : "compare"}
                  </Link>
                </div>
              );
            })}
          </div>
          <div className="card-body" style={{ borderTop: "1px solid var(--line-2)" }}>
            <div className="tiny muted" style={{ lineHeight: 1.6 }}>
              A snapshot is written in the same transaction as the version row, so a version can never exist without
              the tree it describes.
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
