import { completeJson, llmVisionConfigured } from "./llm.ts";
import { auditAttempt, type AiAuditEntry } from "./ai-audit";
import { VISION_PROMPT, renderPrompt } from "./prompts";

export type PdfPageImage = { page: number; dataUrl: string };
export type PdfVisualSummary =
  | { ok: true; text: string; pages: number[]; hasTeachingContent: boolean; model: string; provider: string; ms: number; auditRuns: AiAuditEntry[] }
  | { ok: false; reason: "not_configured" | "unavailable" | "invalid_response"; auditRuns?: AiAuditEntry[] };

type PageObservation = { page: number; hasTeachingContent: boolean; observations: string[]; uncertainties: string[] };

function lines(value: unknown, maximum: number, maxLength: number): string[] | null {
  if (!Array.isArray(value) || value.length > maximum) return null;
  const result: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") return null;
    const text = entry.replace(/\s+/g, " ").trim();
    if (text.length < 4 || text.length > maxLength || !/[\p{L}\p{N}]/u.test(text)) return null;
    result.push(text);
  }
  return result;
}

function observationsFor(value: unknown, requested: number[]): PageObservation[] | null {
  if (value === null || typeof value !== "object") return null;
  const raw = (value as { pages?: unknown }).pages;
  if (!Array.isArray(raw) || raw.length !== requested.length) return null;
  const seen = new Set<number>();
  const result: PageObservation[] = [];
  for (const entry of raw) {
    if (entry === null || typeof entry !== "object") return null;
    const row = entry as Record<string, unknown>;
    const page = row.page;
    if (typeof page !== "number" || !Number.isInteger(page) || !requested.includes(page) || seen.has(page)) return null;
    if (typeof row.hasTeachingContent !== "boolean") return null;
    const observations = lines(row.observations, 6, 1000);
    const uncertainties = lines(row.uncertainties, 4, 500);
    if (!observations?.length || !uncertainties) return null;
    seen.add(page);
    result.push({ page, hasTeachingContent: row.hasTeachingContent, observations, uncertainties });
  }
  return requested.map((page) => result.find((entry) => entry.page === page)!);
}

/** Summarise selected full-page renders; images stay transient and are never stored. */
export async function summarizePdfPages(
  pages: PdfPageImage[],
  options: { fileName: string; timeoutMs?: number },
): Promise<PdfVisualSummary> {
  if (!llmVisionConfigured()) return { ok: false, reason: "not_configured" };
  const requested = pages.map((page) => page.page);
  if (pages.length < 1 || pages.length > 4 || new Set(requested).size !== pages.length ||
      pages.some((page) => !Number.isInteger(page.page) || page.page < 1 || !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(page.dataUrl))) {
    return { ok: false, reason: "invalid_response" };
  }

  const started = Date.now();
  const auditRuns: AiAuditEntry[] = [];
  const call = await completeJson({
    capability: "vision",
    images: pages.map(({ dataUrl }) => ({ dataUrl })),
    totalTimeoutMs: Math.min(options.timeoutMs ?? 25_000, 25_000),
    maxAttempts: 2,
    maxTokens: 2200,
    system: VISION_PROMPT.system,
    user: renderPrompt(VISION_PROMPT.userTemplate, { fileName: JSON.stringify(options.fileName), pages: requested.join(", ") }),
    onAttempt: (attempt) => {
      const audit = auditAttempt("vision", VISION_PROMPT.version, attempt);
      audit.metadata = { ...audit.metadata, fileName: options.fileName, pages: requested };
      auditRuns.push(audit);
    },
  });
  if (!call) return { ok: false, reason: "unavailable", ...(auditRuns.length ? { auditRuns } : {}) };
  const rejected = (): PdfVisualSummary => {
    const reply = auditRuns.findLast((audit) => audit.outcome === "used");
    if (reply) { reply.outcome = "rejected"; reply.metadata = { ...reply.metadata, reason: "invalid_vision_response" }; }
    return { ok: false, reason: "invalid_response", ...(auditRuns.length ? { auditRuns } : {}) };
  };
  const observations = observationsFor(call.value, requested);
  if (!observations) return rejected();
  const text = observations.map((page) => [
    `## PDF page ${page.page}: AI visual observations (teacher review required)`,
    ...page.observations.map((observation) => `Observed: ${observation}`),
    ...page.uncertainties.map((uncertainty) => `Uncertain: ${uncertainty}`),
  ].join("\n")).join("\n\n");
  if (text.length > 12_000) return rejected();
  if (!auditRuns.some((audit) => audit.outcome === "used")) auditRuns.push({
    purpose: "vision", promptVersion: VISION_PROMPT.version, model: call.model, provider: call.provider,
    outcome: "used", tokensIn: call.tokensIn ?? null, tokensOut: call.tokensOut ?? null, latencyMs: call.ms,
    metadata: { fileName: options.fileName, pages: requested },
  });
  return { ok: true, text, pages: requested, hasTeachingContent: observations.some((page) => page.hasTeachingContent), model: call.model, provider: call.provider, ms: Date.now() - started, auditRuns };
}
