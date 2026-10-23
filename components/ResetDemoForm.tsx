"use client";

import { useState } from "react";

/**
 * The confirmation half of the demo reset.
 *
 * The button stays disabled until the word RESET is typed. That is not
 * decoration: the action behind it deletes every row in the database, and a
 * button that is one stray click away from an empty demo is a liability.
 *
 * The server checks the same word again — a disabled attribute is a courtesy to
 * the user, not a security control.
 *
 * This component holds no result state. The action redirects back to /settings
 * with a query string, and the page renders the outcome from that. Keeping the
 * outcome on the server means a slow reset cannot leave the button stuck
 * showing "Resetting…" after the work is already done.
 */
export default function ResetDemoForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  const [typed, setTyped] = useState("");
  const ready = typed.trim().toUpperCase() === "RESET";

  return (
    <form action={action} style={{ marginTop: "10px" }}>
      <div className="row" style={{ gap: "8px" }}>
        <input
          className="input"
          name="confirm"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder="Type RESET to confirm"
          autoComplete="off"
          spellCheck={false}
          aria-label="Type RESET to confirm"
          style={{ height: "30px", padding: "0 9px", fontSize: "12.5px", flex: 1 }}
        />
        <button
          className="btn btn-sm"
          type="submit"
          disabled={!ready}
          title={ready ? "Delete every row and re-insert the demo fixture" : "Type RESET first"}
        >
          Reset demo data
        </button>
      </div>
    </form>
  );
}
