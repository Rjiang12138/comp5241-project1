"use client";

import { useState } from "react";

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
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function StudioBrief({ formAction, pending, message, error, defaultTitle, defaultBrief }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [audience, setAudience] = useState("non_cs");
  const [minutes, setMinutes] = useState("45");

  return (
    <form className="stack" id="studio-form" action={formAction}>
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
              Add a slide deck, Markdown or text file. Without one, the brief alone is enough to start.
            </div>
          ) : null}

          <label
            className="btn btn-sm"
            style={{ width: "100%", justifyContent: "center", marginTop: "2px", cursor: "pointer" }}
          >
            + Add material
            <input
              type="file"
              name="material"
              multiple
              accept=".pdf,.md,.txt,.csv,application/pdf,text/plain,text/markdown"
              style={{ display: "none" }}
              onChange={(event) => {
                const picked = Array.from(event.target.files ?? []);
                if (picked.length > 0) setFiles(picked);
              }}
            />
          </label>
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
              defaultValue={defaultTitle ?? "Software Engineering Foundations"}
            />
          </div>
          <div className="field">
            <label>What should learners be able to do?</label>
            <textarea
              className="textarea"
              id="brief"
              name="brief"
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
            disabled={pending}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></svg>
            {pending ? "Generating…" : "Generate outline"}
          </button>
          <div
            className="tiny"
            style={{
              textAlign: "center",
              marginTop: "8px",
              color: message ? (error ? "#912018" : "var(--muted)") : "var(--muted-2)",
              lineHeight: 1.5,
            }}
          >
            {message ?? "You can edit, reorder or delete anything it produces."}
          </div>
        </div>
      </div>
    </form>
  );
}
