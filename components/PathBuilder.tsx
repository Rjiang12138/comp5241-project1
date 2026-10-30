"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

/**
 * The path form.
 *
 * Same markup as the prototype's left column — the same `.seg` groups, the same
 * fields — with the segmented controls mirrored into hidden inputs so the form
 * posts without JavaScript state on the server side.
 */

const DOMAINS = [
  { value: "backend", label: "Backend" },
  { value: "data", label: "Data" },
  { value: "product", label: "Product" },
  { value: "design", label: "Design" },
];

const LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "some", label: "Some code" },
  { value: "confident", label: "Confident" },
];

const HOURS = [
  { value: "2", label: "2 h / week" },
  { value: "4", label: "4 h / week" },
  { value: "8", label: "8 h / week" },
];

const WEEKS = [
  { value: "2", label: "2 weeks" },
  { value: "4", label: "4 weeks" },
  { value: "6", label: "6 weeks" },
];

export default function PathBuilder({
  action,
  defaultGoal,
  error,
}: {
  action: (formData: FormData) => void;
  defaultGoal?: string;
  error?: string;
}) {
  const [domain, setDomain] = useState("backend");
  const [level, setLevel] = useState("beginner");
  const [hours, setHours] = useState("4");
  const [weeks, setWeeks] = useState("4");

  const seg = (
    options: Array<{ value: string; label: string }>,
    current: string,
    set: (value: string) => void,
    wrap = false,
  ) => (
    <div className="seg" style={wrap ? { flexWrap: "wrap" } : undefined}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          data-val={option.value}
          className={current === option.value ? "on" : undefined}
          onClick={() => set(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );

  return (
    <form className="stack" action={action}>
      <div className="card">
        <div className="card-head">
          <h3>Your goal</h3>
          <span className="tiny muted">step 1 of 2</span>
        </div>
        <div className="card-body">
          <div className="field">
            <label>What do you want to be able to do?</label>
            <textarea
              className="textarea"
              name="goal"
              style={{ minHeight: "74px" }}
              defaultValue={
                defaultGoal ??
                "Prepare for a backend engineering internship interview in four weeks. I study business, not CS, and I have only written small scripts."
              }
            />
            {error ? (
              <div className="tiny" style={{ color: "#912018", marginTop: "6px" }}>
                {error}
              </div>
            ) : null}
          </div>

          <div className="field">
            <label>Domain</label>
            {seg(DOMAINS, domain, setDomain, true)}
          </div>

          <div className="field">
            <label>Starting point</label>
            {seg(LEVELS, level, setLevel)}
          </div>

          <div className="field">
            <label>Time you can give it</label>
            {seg(HOURS, hours, setHours)}
          </div>

          <div className="field mb-0">
            <label>How long you have</label>
            {seg(WEEKS, weeks, setWeeks)}
          </div>
        </div>

        <div className="card-body" style={{ borderTop: "1px solid var(--line-2)", paddingTop: "14px" }}>
          <input type="hidden" name="domain" value={domain} />
          <input type="hidden" name="level" value={level} />
          <input type="hidden" name="hours" value={hours} />
          <input type="hidden" name="weeks" value={weeks} />
          <SubmitButton />
          <div className="tiny muted" style={{ textAlign: "center", marginTop: "8px" }}>
            Matches your level, not an average learner&apos;s.
          </div>
        </div>
      </div>
    </form>
  );
}

/**
 * The submit control reads the real form status, so "Designing…" is on screen
 * for exactly as long as the server action is running — the model call can take
 * several seconds and a dead button with no feedback reads as a broken button.
 */
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={pending}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></svg>
      {pending ? "Designing…" : "Design my path"}
    </button>
  );
}
