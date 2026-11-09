"use client";

import { useActionState } from "react";
import { generateCourseAction } from "@/app/studio/actions";
import { initialStudioState } from "@/app/studio/state";
import StudioBrief from "@/components/StudioBrief";
import type { OutlineActivity, OutlineModule } from "@/lib/generate";
import type { recentUnattachedAiRuns } from "@/lib/store";

/**
 * The three-column body of the studio screen.
 *
 * The prototype draws this screen as brief → draft → log, side by side. That
 * layout only makes sense if all three columns are about the same run, so the
 * state lives here and the columns read from it. Everything below is the
 * prototype's markup with real values in it: module rows come from the parsed
 * deck, the log's timings come from the phases that actually ran, and the
 * pedagogy score is computed from the outline instead of being typed in.
 */

const FORMAT: Record<OutlineActivity["format"], { label: string; pill: string }> = {
  reading: { label: "Reading", pill: "pill-line" },
  simulation: { label: "Simulation", pill: "pill-brand" },
  code_lab: { label: "Code lab", pill: "pill-teal" },
  role_play: { label: "Role play", pill: "pill-amber" },
  quiz: { label: "Quiz", pill: "" },
};

function formatPill(format: OutlineActivity["format"]) {
  return FORMAT[format] ?? FORMAT.reading;
}

function seconds(ms: number): string {
  return (ms / 1000).toFixed(1);
}

/** Four checks that can be made by reading the outline — no invented findings. */
function pedagogy(modules: OutlineModule[]): { label: string; ok: boolean }[] {
  const last = modules[modules.length - 1];
  return [
    {
      label: "Objectives map to activities",
      ok: modules.length > 0 && modules.every((module) => module.activities.length > 0),
    },
    {
      label: `Cognitive load: ${modules.length} modules ${modules.length < 7 ? "<" : "≥"} 7`,
      ok: modules.length > 0 && modules.length < 7,
    },
    {
      label: "Retrieval practice at the end",
      ok: Boolean(last && last.activities.some((activity) => activity.format === "quiz")),
    },
    {
      label: "Every module has a hands-on activity",
      ok: modules.length > 0 && modules.every((module) => module.activities.some((a) => a.format !== "reading")),
    },
  ];
}

function attemptDetails(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const data = value as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof data.fileName === "string") parts.push(data.fileName);
  if (Array.isArray(data.pages) && data.pages.every((page) => Number.isInteger(page) && page > 0)) parts.push(`PDF pages ${data.pages.join(", ")}`);
  if (typeof data.reason === "string") parts.push(data.reason);
  if (typeof data.httpStatus === "number") parts.push(`HTTP ${data.httpStatus}`);
  return parts.join(" · ");
}

export default function StudioWorkspace({ recentAttempts = [] }: { recentAttempts?: Awaited<ReturnType<typeof recentUnattachedAiRuns>> }) {
  const [state, formAction, pending] = useActionState(generateCourseAction, initialStudioState);
  const outline = state.outline;
  const modules = outline?.modules ?? [];

  const checks = pedagogy(modules);
  const passed = checks.filter((check) => check.ok).length;
  const activityCount = modules.reduce((sum, module) => sum + module.activities.length, 0);
  const totalMinutes = modules.reduce((sum, module) => sum + module.estimatedMinutes, 0);
  const pages = (outline?.sources ?? []).reduce((sum, source) => sum + source.pages, 0);
  const logMs = (outline?.steps ?? []).reduce((sum, step) => sum + step.ms, 0);
  // No sources means the outline came from the brief alone, which changes what
  // the explanation card below is allowed to claim.
  const fromBrief = outline !== null && outline !== undefined && outline.sources.length === 0;

  const statusLine = outline
    ? `Draft ready · ${modules.length} modules · ${activityCount} activities · ${totalMinutes} min`
    : "No draft yet · fill in the brief, then generate";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "336px minmax(0,1fr) 288px", gap: "16px", alignItems: "start" }}>
      <StudioBrief
        formAction={formAction}
        pending={pending}
        message={state.message}
        error={state.status === "error"}
      />

      <div className="card">
        <div className="card-head">
          <div>
            <h3>3 · Draft outline</h3>
            <div className="tiny muted" id="genStatus" style={{ marginTop: "2px" }}>
              {statusLine}
            </div>
          </div>
          <div className="row">
            {outline ? (
              <span className="pill pill-teal">
                {passed === checks.length ? "Pedagogy checked" : `Pedagogy ${passed}/${checks.length}`}
              </span>
            ) : null}
            {outline ? (
              <button className="btn btn-sm" type="submit" form="studio-form" disabled={pending}>
                {pending ? "Working…" : "Regenerate"}
              </button>
            ) : null}
          </div>
        </div>

        {outline ? (
          <div id="outline">
            {modules.map((module, index) => {
              const primary = module.activities[0];
              const formats = Array.from(new Set(module.activities.map((activity) => formatPill(activity.format).label)));

              return (
                <div className="module-row" key={`${module.title}-${index}`}>
                  <span className="module-idx">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <div style={{ fontWeight: "600", fontSize: "13px" }}>{module.title}</div>
                    <div className="meta">
                      {formats.join(" + ")} · {module.objective}
                    </div>
                  </div>
                  <div className="right">
                    {primary ? (
                      <span className={`pill ${formatPill(primary.format).pill}`}>{formatPill(primary.format).label}</span>
                    ) : null}
                    <span className="pill">{module.estimatedMinutes} min</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card-body">
            <div className="tiny muted" style={{ lineHeight: 1.6 }}>
              Nothing generated yet. Describe the outcome on the left, add your slides if you have them, then press{" "}
              <b>Generate outline</b>. The draft lands here and in your course list at the same time.
            </div>
          </div>
        )}

        {outline && state.courseId ? (
          <div
            className="card-body"
            style={{ borderTop: "1px solid var(--line-2)", background: "#fbfbfd", borderRadius: "0 0 12px 12px" }}
          >
            <div className="between">
              <div className="row tiny muted">
                <span>◈</span> Generated from {outline.sources.length} source
                {outline.sources.length === 1 ? "" : "s"} · {pages} pages
                {outline.sources.some((source) => source.visualPages?.length)
                  ? ` · AI read ${outline.sources.reduce((sum, source) => sum + (source.visualPages?.length ?? 0), 0)} visual pages`
                  : " · no visual interpretation"}
              </div>
              <div className="row">
                <a className="btn btn-sm btn-primary" href={`/courses/${state.courseId}`}>
                  Open in editor
                </a>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="stack">
        {recentAttempts.length > 0 ? (
          <div className="card">
            <div className="card-head"><h3>Recent attempts without a course</h3></div>
            <div className="card-body" style={{ fontSize: "12px", lineHeight: 1.6 }}>
              {recentAttempts.map((run) => (
                <div key={run.id} style={{ marginBottom: "10px" }}>
                  <b>{run.purpose === "vision" ? "PDF visual analysis" : "Course outline"}</b> · {run.outcome}<br />
                  {run.provider ?? "provider unknown"} · {run.model}<br />
                  <span className="tiny muted">{run.createdAt.slice(0, 10)} · {(run.latencyMs / 1000).toFixed(1)} s · input {run.tokensIn ?? "unknown"} · output {run.tokensOut ?? "unknown"} tokens · cost unknown<br />Prompt {run.promptVersion}</span>
                  {attemptDetails(run.metadata) ? <div className="tiny muted">{attemptDetails(run.metadata)}</div> : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="card">
          <div className="card-head">
            <h3>Generation log</h3>
            <span className="tiny muted mono">{outline ? `${seconds(logMs)}s` : "—"}</span>
          </div>
          <div className="card-body" style={{ paddingTop: "8px" }}>
            {outline ? (
              <div className="log">
                {outline.steps.map((step) => (
                  <div className="log-step" key={step.label}>
                    <span className="tick">✓</span>
                    <div className="body">
                      <b>{step.label}</b>
                      <span>{step.detail}</span>
                    </div>
                    <span className="time">{seconds(step.ms)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="tiny muted" style={{ lineHeight: 1.6 }}>
                Steps appear after generation, with the time each one took.
              </div>
            )}
            <div className="footnote" style={{ marginTop: "10px" }}>
              The course editor keeps the model, prompt version and available token counts for each recorded attempt.
              Teacher review is recorded when the reviewed course is published.
            </div>
          </div>
        </div>

        {outline ? (
          <div className="card">
            <div className="card-head">
              <h3>Pedagogy check</h3>
              <span className="pill pill-teal">
                {passed} / {checks.length}
              </span>
            </div>
            <div className="card-body" style={{ fontSize: "12.4px", display: "flex", flexDirection: "column", gap: "9px" }}>
              {checks.map((check) => (
                <div className="row" key={check.label}>
                  <span
                    className={`pill ${check.ok ? "pill-teal" : "pill-amber"}`}
                    style={{ height: "18px", padding: "0 6px" }}
                  >
                    {check.ok ? "✓" : "!"}
                  </span>
                  {check.label}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="card card-pad" style={{ background: "var(--brand-soft)", borderColor: "#dbe1ff" }}>
          <div className="eyebrow" style={{ color: "#4338ca" }}>
            {outline ? (outline.template ? "Template draft" : "Model draft") : "Note"}
          </div>
          <div style={{ fontSize: "12.4px", marginTop: "5px", lineHeight: "1.6" }}>
            {!outline ? (
              <>
                The draft is generated from <b>your own material</b> — a deck, or the brief if you have none. Module
                titles come from what you supplied. Source excerpts and, when enabled, rendered PDF pages are sent
                to the configured AI provider. Visual interpretations are labelled and need your review.
              </>
            ) : outline.template ? (
              fromBrief ? (
                <>
                  This draft is <b>template-based</b>: the modules are cut from the sentences of your brief, objectives
                  repeat what you asked for, and the minutes are split across the length you chose. No text was
                  invented — which is why it reads like an outline of your own sentence rather than a designed course.
                  Add a key to let a model design the sequence instead.
                </>
              ) : (
                <>
                  This draft is <b>template-based</b>: titles come from your slides, objectives from the first line
                  under each title, and minutes are split across whatever you asked for. Any AI visual interpretations
                  are included as labelled observations. Check them against the original pages before publishing.
                </>
              )
            ) : (
              <>
                This draft was written by <b>{outline.model}</b> from {fromBrief ? "your brief" : "section sketches and any labelled PDF visual observations"}.
                Before saving, the structure and activity types are checked, and the times are adjusted to your requested
                duration. Check the objectives, source accuracy and teaching order before publishing — these require
                instructor review.
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
