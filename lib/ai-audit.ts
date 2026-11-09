import type { LlmAttempt } from "./llm";

/** Only metadata, never prompts filled with source text, image data, or keys. */
export type AiAuditEntry = {
  purpose: "outline" | "vision";
  promptVersion: string;
  model: string;
  provider: string | null;
  outcome: "used" | "rejected" | "failed" | "template";
  tokensIn: number | null;
  tokensOut: number | null;
  latencyMs: number;
  metadata?: { sent?: boolean; httpStatus?: number; reason?: string; fileName?: string; pages?: number[]; sequence?: number };
};

export function auditAttempt(purpose: AiAuditEntry["purpose"], promptVersion: string, attempt: LlmAttempt): AiAuditEntry {
  return { purpose, promptVersion, model: attempt.model, provider: attempt.provider,
    outcome: attempt.outcome === "response" ? "used" : "failed", tokensIn: attempt.tokensIn,
    tokensOut: attempt.tokensOut, latencyMs: Math.max(0, Math.round(attempt.latencyMs)),
    metadata: { sent: attempt.sent, ...(attempt.httpStatus ? { httpStatus: attempt.httpStatus } : {}),
      ...(attempt.outcome === "invalid_json" ? { reason: "invalid_json" } : {}) } };
}
