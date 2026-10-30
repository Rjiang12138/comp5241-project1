/**
 * A very small OpenRouter client.
 *
 * It exists for one reason: the generation pipeline needs a seam where a model
 * can be called without the rest of the app knowing which model, which provider
 * or which SDK. Everything here is server-side and every failure path returns
 * `null` rather than throwing, because a course generator that dies when the
 * network hiccups is worse than one that falls back to a template and says so.
 *
 * Configuration:
 *   OPENROUTER_API_KEY  — required; without it the pipeline stays template-only.
 *   OPENROUTER_MODEL    — optional override; otherwise the free chain below is
 *                         tried in order until one returns parseable JSON.
 */

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Free-tier models, tried in order.
 *
 * Both of these were picked by measuring, not by reputation: they return valid
 * JSON for the outline prompt in 12–16s and stay inside the lecture material.
 * Reasoning-heavy free models were dropped — they spend the whole token budget
 * on reasoning and return an empty `content`, which is indistinguishable from a
 * failure at this layer.
 */
const DEFAULT_MODELS = ["poolside/laguna-s-2.1:free", "nvidia/nemotron-3-ultra-550b-a55b:free"];

export function llmConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export type LlmCall = {
  value: unknown;
  model: string;
  ms: number;
  /** True when the first model in the chain failed and a later one answered. */
  fellBack: boolean;
};

/** Pull the first JSON object out of a reply that may be fenced or prefixed. */
function extractJson(raw: string): unknown {
  const withoutFence = raw.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "").trim();
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object in reply");
  return JSON.parse(withoutFence.slice(start, end + 1));
}

/**
 * Ask for a JSON object, trying each model in the chain until one answers.
 *
 * A model that returns 200 with unparseable content counts as a failure — that
 * is the common shape of a truncated or reasoning-only reply, and treating it
 * as success would push garbage into the database.
 */
export async function completeJson(options: {
  system: string;
  user: string;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<LlmCall | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;

  const configured = process.env.OPENROUTER_MODEL?.trim();
  const models = configured ? [configured] : DEFAULT_MODELS;
  const timeoutMs = options.timeoutMs ?? 90_000;

  for (const [index, model] of models.entries()) {
    const started = Date.now();
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          // OpenRouter uses these for attribution only; harmless if ignored.
          "HTTP-Referer": "http://localhost:3123",
          "X-Title": "Praxis",
        },
        body: JSON.stringify({
          model,
          max_tokens: options.maxTokens ?? 2000,
          temperature: 0.3,
          messages: [
            { role: "system", content: options.system },
            { role: "user", content: options.user },
          ],
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) continue;

      const payload = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = payload.choices?.[0]?.message?.content ?? "";
      if (!content.trim()) continue;

      return {
        value: extractJson(content),
        model,
        ms: Date.now() - started,
        fellBack: index > 0,
      };
    } catch {
      // Timeout, network error, unparseable body: try the next model.
    }
  }

  return null;
}
