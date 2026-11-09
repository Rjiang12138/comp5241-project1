"use client";

import { useEffect, useRef, useState } from "react";
import {
  MATERIAL_ACCEPT,
  MATERIAL_HELP,
  MAX_BRIEF_CHARS,
  MAX_TITLE_CHARS,
  validateMaterials,
  validateStudioInput,
} from "@/lib/studio-input";

/**
 * The left column of the studio screen: source material and the brief.
 *
 * Everything here is the prototype's markup — same classes, same order, same
 * labels — with the two things a static page cannot do: a real file picker and
 * a form that posts to the generation action. The segmented controls stay
 * buttons because that is what `.seg` styles, so their state is mirrored into
 * hidden inputs rather than replaced with radios the CSS does not know about.
 */

type Props = {
  formAction: (formData: FormData) => void;
  pending: boolean;
  message?: string;
  error?: boolean;
  defaultTitle?: string;
  defaultBrief?: string;
};

const AUDIENCE = [
  { value: "non_cs", label: "Non-CS" },
  { value: "cs", label: "CS" },
  { value: "mixed", label: "Mixed" },
];

const LENGTHS = [
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "90", label: "90 min" },
];

const EXT_CLASS: Record<string, string> = { pdf: "", md: "md", csv: "", txt: "md" };

function extension(name: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(name);
  return match ? match[1].toLowerCase() : "txt";
}

function size(bytes: number): string {
  if (bytes === 0) return "0 bytes";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function StudioBrief({ formAction, pending, message, error, defaultTitle, defaultBrief }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [audience, setAudience] = useState("non_cs");
  const [minutes, setMinutes] = useState("45");
  const [includeVisuals, setIncludeVisuals] = useState(true);
  const [visualPageRange, setVisualPageRange] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const materialError = validateMaterials(files);
  const feedback = clientError ?? materialError ?? message;
  const hasError = Boolean(clientError || materialError || (message && error));

  // React actions reset the native picker after settling, including error returns.
  // Read it back after that commit so the chips never describe a stale selection.
  useEffect(() => {
    if (!pending && fileInput.current) setFiles(Array.from(fileInput.current.files ?? []));
  }, [pending, message]);

  return (
    <form
      className="stack"
      id="studio-form"
      action={formAction}
      onReset={() => {
        setFiles([]);
        setClientError(null);
      }}
      onSubmit={(event) => {
        const data = new FormData(event.currentTarget);
        const inputError = validateStudioInput({
          title: String(data.get("title") ?? "").trim(),
          brief: String(data.get("brief") ?? "").trim(),
          files,
          includeVisuals,
          visualPageRange,
        });
        setClientError(inputError);
        if (inputError) event.preventDefault();
      }}
    >
      <div className="card">
        <div className="card-head">
          <h3>1 · Source material</h3>
          <span className="tiny muted">
            {files.length === 0 ? "optional" : `${files.length} ${files.length === 1 ? "file" : "files"}`}
          </span>
        </div>
        <div className="card-body" style={{ paddingBottom: "10px" }}>
          {files.map((file) => (
            <div className="chip-file" key={`${file.name}-${file.size}`}>
              <span className={`ext ${EXT_CLASS[extension(file.name)] ?? ""}`}>
                {extension(file.name).toUpperCase().slice(0, 3)}
              </span>
              {file.name}
              <span className="size">{size(file.size)}</span>
            </div>
          ))}

          {files.length === 0 ? (
            <div className="tiny muted" style={{ marginBottom: "8px", lineHeight: 1.5 }}>
              Add teaching material, or start from a brief of at least 20 characters.
            </div>
          ) : null}

          <label
            className="btn btn-sm"
            style={{ width: "100%", justifyContent: "center", marginTop: "2px", cursor: "pointer" }}
          >
            Choose material
            <input
              type="file"
              ref={fileInput}
              name="material"
              multiple
              disabled={pending}
              accept={MATERIAL_ACCEPT}
              aria-label="Source material"
              aria-describedby="studio-material-help studio-input-message"
              style={{ display: "none" }}
              onChange={(event) => {
                const picked = Array.from(event.target.files ?? []);
                setFiles(picked);
                setClientError(null);
              }}
            />
          </label>
          <div className="tiny muted" id="studio-material-help" style={{ marginTop: "8px", lineHeight: 1.5 }}>
            {MATERIAL_HELP} Choosing again replaces the selection.
          </div>
          <div className="field" style={{ marginTop: "12px", marginBottom: 0 }}>
            <label style={{ display: "flex", gap: "7px", alignItems: "center" }}>
              <input
                type="checkbox"
                name="includeVisuals"
                checked={includeVisuals}
                disabled={pending}
                onChange={(event) => { setIncludeVisuals(event.target.checked); setClientError(null); }}
              />
              Understand PDF diagrams with AI
            </label>
            <div className="hint">
              Sends full selected pages to the configured vision model to read flowcharts, architecture diagrams and scans.
              One PDF and up to 4 visual pages per generation. Turn off for selectable text only; images are then ignored.
            </div>
            {includeVisuals ? (
              <>
                <label htmlFor="studio-visual-pages" style={{ marginTop: "8px" }}>Diagram pages (optional)</label>
                <input
                  className="input"
                  id="studio-visual-pages"
                  name="visualPages"
                  placeholder="Auto-detect, or e.g. 2,5-7"
                  value={visualPageRange}
                  maxLength={100}
                  disabled={pending}
                  onChange={(event) => { setVisualPageRange(event.target.value); setClientError(null); }}
                />
                <div className="hint">Page numbers refer to the PDF page order. Auto-detection may include logos or decorations.</div>
              </>
            ) : null}
          </div>
          {files.length > 0 ? (
            <button
              className="btn btn-sm"
              type="button"
              disabled={pending}
              style={{ marginTop: "8px" }}
              onClick={() => {
                if (fileInput.current) fileInput.current.value = "";
                setFiles([]);
                setClientError(null);
              }}
            >
              Clear files
            </button>
          ) : null}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>2 · Brief</h3>
          <span className="pill pill-line">~{minutes} min</span>
        </div>
        <div className="card-body">
          <div className="field">
            <label>Course title</label>
            <input
              className="input"
              name="title"
              maxLength={MAX_TITLE_CHARS}
              onChange={() => setClientError(null)}
              defaultValue={defaultTitle ?? "Software Engineering Foundations"}
            />
          </div>
          <div className="field">
            <label>What should learners be able to do?</label>
            <textarea
              className="textarea"
              id="brief"
              name="brief"
              maxLength={MAX_BRIEF_CHARS}
              onChange={() => setClientError(null)}
              defaultValue={
                defaultBrief ??
                "Design a 45-minute sequence for first-year students who have never written code. Cover what software engineering is, how requirements turn into a plan, and how to work with an AI coding agent without losing judgement. Every module needs one hands-on activity."
              }
            />
            <div className="hint">Be concrete about the outcome, the audience and the time budget.</div>
          </div>
          <div className="field">
            <label>Audience</label>
            <div className="seg">
              {AUDIENCE.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={audience === option.value ? "on" : undefined}
                  onClick={() => setAudience(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="hint">Drives vocabulary, examples and hint density.</div>
          </div>
          <div className="field mb-0">
            <label>Session length</label>
            <div className="seg">
              {LENGTHS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={minutes === option.value ? "on" : undefined}
                  onClick={() => setMinutes(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="card-body" style={{ borderTop: "1px solid var(--line-2)", paddingTop: "14px" }}>
          <input type="hidden" name="audience" value={audience} />
          <input type="hidden" name="minutes" value={minutes} />
          <button
            type="submit"
            className="btn btn-primary"
            id="genBtn"
            style={{ width: "100%", justifyContent: "center" }}
            disabled={pending || Boolean(materialError)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></svg>
            {pending ? "Generating…" : "Generate outline"}
          </button>
          <div
            className="tiny"
            id="studio-input-message"
            role={hasError ? "alert" : "status"}
            aria-live="polite"
            style={{
              textAlign: "center",
              marginTop: "8px",
              color: feedback ? (hasError ? "#912018" : "var(--muted)") : "var(--muted-2)",
              lineHeight: 1.5,
            }}
          >
            {feedback ?? "You can edit, reorder or delete anything it produces."}
          </div>
        </div>
      </div>
    </form>
  );
}
