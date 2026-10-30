"use client";

import { useActionState } from "react";
import { generateCourseAction } from "@/app/studio/actions";
import { initialStudioState } from "@/app/studio/state";
import StudioBrief from "@/components/StudioBrief";
import type { OutlineActivity, OutlineModule } from "@/lib/generate";

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

export default function StudioWorkspace() {
  const [state, formAction, pending] = useActionState(generateCourseAction, initialStudioState);
  const outline = state.outline;
  const modules = outline?.modules ?? [];

  const checks = pedagogy(modules);
  const passed = checks.filter((check) => check.ok).length;
  const activityCount = modules.reduce((sum, module) => sum + module.activities.length, 0);
  const totalMinutes = modules.reduce((sum, module) => sum + module.estimatedMinutes, 0);
  const pages = (outline?.sources ?? []).reduce((sum, source) => sum + source.pages, 0);
  const logMs = (outline?.steps ?? []).reduce((sum, step) => sum + step.ms, 0);

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
                {outline.sources.length === 1 ? "" : "s"} · {pages} pages · no external content
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
                Steps appear here as they run, with the time each one took.
              </div>
            )}
            <div className="footnote" style={{ marginTop: "10px" }}>
              Every step is logged so the draft can be audited later — the run is also written to{" "}
              <span className="mono">ai_runs</span>.
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
                The draft is generated from <b>your own material</b>. Module titles come from your slides, and nothing
                leaves the machine except the titles and first lines sent to the model, if one is configured.
              </>
            ) : outline.template ? (
              <>
                This draft is <b>template-based</b>: titles come from your slides, objectives from the first line under
                each title, and minutes are split across whatever you asked for. No text was invented — which is why it
                reads like an index of the deck. Add a key to let a model design the sequence instead.
              </>
            ) : (
              <>
                This draft was written by <b>{outline.model}</b> from the titles and first lines of your material. It
                was validated before saving: formats are checked against the allowed set, and minutes are rescaled so
                each module adds up. Check the objectives before you publish — the model has not read your slides in
                full.
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
