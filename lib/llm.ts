/**
 * The model seam.
 *
 * Two providers in a fixed order — ChatAnywhere first, OpenRouter as the spare.
 * The order is a preference, not a load balancer: a call only reaches OpenRouter
 * when ChatAnywhere declined (no key, rate limit, bad key, empty reply).
 *
 * Everything here is server-side and every failure path returns `null` rather
 * than throwing, because a course generator that dies when the network hiccups
 * is worse than one that falls back to a template and says so.
 *
 * ## Why this file is mostly about waiting
 *
 * Both keys are free tiers, and a free tier that gets hammered stops answering
 * — permanently, in the case of a ban. So:
 *
 *   - every call goes through one queue, so two activities never ask at once;
 *   - consecutive calls are spaced by `LLM_MIN_GAP_MS` (4 s by default);
 *   - a 429 waits what the server asked for (capped at 30 s), retries once,
 *     then gives up on that model rather than hammering it;
 *   - the whole chain shares an attempt budget of four, so a bad afternoon
 *     costs four requests and not twelve.
 *
 * The pipeline is built to be slow. A course takes tens of seconds to generate
 * and the screen shows the log while it happens; nobody is watching a spinner
 * that needs to finish in one second.
 *
 * ## Configuration
 *
 *   CHATANYWHERE_API_KEY   primary; without it the chain starts at OpenRouter
 *   CHATANYWHERE_BASE_URL  default https://api.chatanywhere.tech/v1
 *   CHATANYWHERE_MODEL     default gpt-4o-mini
 *   OPENROUTER_API_KEY     fallback
 *   OPENROUTER_MODEL       optional pin, otherwise the free chain below
 *   LLM_MIN_GAP_MS         minimum gap between calls, default 4000
 *
 * With no key at all, `llmConfigured()` is false and the pipeline stays
 * template-only, which is a supported mode and not an error.
 */

type ProviderId = "chatanywhere" | "openrouter";

type Provider = {
  id: ProviderId;
  label: string;
  endpoint: string;
  key: string;
  models: string[];
  /** Attribution headers; OpenRouter reads them, ChatAnywhere ignores them. */
  headers: Record<string, string>;
};

/**
 * Free OpenRouter models, tried in order.
 *
 * Both were picked by measuring, not by reputation: they return valid JSON for
 * the outline prompt in 12–16 s and stay inside the lecture material.
 * Reasoning-heavy free models were dropped — they spend the whole token budget
 * on reasoning and return an empty `content`, which is indistinguishable from a
 * failure at this layer.
 */
const OPENROUTER_MODELS = ["poolside/laguna-s-2.1:free", "nvidia/nemotron-3-ultra-550b-a55b:free"];

const DEFAULT_CHATANYWHERE_BASE = "https://api.chatanywhere.tech/v1";

/** Total requests one `completeJson()` may spend across every provider. */
const ATTEMPT_BUDGET = 4;

const MAX_RETRY_WAIT_MS = 30_000;

export type LlmCall = {
  value: unknown;
  model: string;
  ms: number;
  /** Which provider answered — shown in the generation log. */
  provider: ProviderId;
  /** True when the first choice failed and a later one answered. */
  fellBack: boolean;
};

function providerChain(): Provider[] {
  const chain: Provider[] = [];

  const chatanywhereKey = process.env.CHATANYWHERE_API_KEY?.trim();
  if (chatanywhereKey) {
    const base = (process.env.CHATANYWHERE_BASE_URL?.trim() || DEFAULT_CHATANYWHERE_BASE).replace(/\/+$/, "");
    chain.push({
      id: "chatanywhere",
      label: "ChatAnywhere",
      endpoint: `${base}/chat/completions`,
      key: chatanywhereKey,
      models: [process.env.CHATANYWHERE_MODEL?.trim() || "gpt-4o-mini"],
      headers: {},
    });
  }

  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (openrouterKey) {
    const pinned = process.env.OPENROUTER_MODEL?.trim();
    chain.push({
      id: "openrouter",
      label: "OpenRouter",
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      key: openrouterKey,
      models: pinned ? [pinned] : OPENROUTER_MODELS,
      headers: { "HTTP-Referer": "http://localhost:3123", "X-Title": "Praxis" },
    });
  }

  return chain;
}

export function llmConfigured(): boolean {
  return providerChain().length > 0;
}

/** What to print on the studio screen, e.g. `ChatAnywhere · gpt-4o-mini`. */
export function llmProviderLabel(): string {
  const chain = providerChain();
  if (chain.length === 0) return "template-v1";
  const first = chain[0];
  const model = first.models.length === 1 ? first.models[0] : "free-tier chain";
  const spare = chain.length > 1 ? ` · spare ${chain[1].label}` : "";
  return `${first.label} · ${model}${spare}`;
}

/* ------------------------------------------------------------- throttle */

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function minGapMs(): number {
  const raw = Number(process.env.LLM_MIN_GAP_MS);
  return Number.isFinite(raw) && raw >= 0 ? raw : 4_000;
}

/** Serialises calls and spaces them out. One queue for the whole process. */
let queue: Promise<unknown> = Promise.resolve();
let lastCallFinishedAt = 0;

function throttled<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = minGapMs() - (Date.now() - lastCallFinishedAt);
    if (wait > 0) await sleep(wait);
    try {
      return await task();
    } finally {
      // Stamped on the way out, not the way in: the gap is breathing room
      // between requests, not a delay before the first one.
      lastCallFinishedAt = Date.now();
    }
  });
  // The chain must survive a rejection or every later call queues behind a
  // promise that will never settle.
  queue = run.catch(() => undefined);
  return run;
}

/* --------------------------------------------------------------- request */

type Attempt =
  | { ok: true; content: string }
  | { ok: false; reason: string; status?: number; retryAfterMs?: number; fatal?: boolean };

/** Pull the first JSON object out of a reply that may be fenced or prefixed. */
function extractJson(raw: string): unknown {
  const withoutFence = raw.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "").trim();
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object in reply");
  return JSON.parse(withoutFence.slice(start, end + 1));
}

function retryAfterMs(response: Response): number | undefined {
  const header = response.headers.get("retry-after");
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.min(MAX_RETRY_WAIT_MS, Math.max(1_000, seconds * 1_000));
  const date = Date.parse(header);
  if (Number.isFinite(date)) return Math.min(MAX_RETRY_WAIT_MS, Math.max(1_000, date - Date.now()));
  return undefined;
}

async function post(
  provider: Provider,
  model: string,
  options: { system: string; user: string; maxTokens?: number },
  timeoutMs: number,
): Promise<Attempt> {
  let response: Response;
  try {
    response = await fetch(provider.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.key}`,
        "Content-Type": "application/json",
        ...provider.headers,
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
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.name : "network error" };
  }

  if (!response.ok) {
    const status = response.status;
    return {
      ok: false,
      status,
      reason: `HTTP ${status}`,
      retryAfterMs: retryAfterMs(response),
      // 401/403 means the key is wrong; retrying it just burns quota. 429 and
      // 5xx are the server asking us to come back.
      fatal: status === 401 || status === 403,
    };
  }

  let payload: { choices?: { message?: { content?: string } }[] };
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    return { ok: false, reason: "unreadable body" };
  }

  const content = payload.choices?.[0]?.message?.content ?? "";
  if (!content.trim()) return { ok: false, reason: "empty content" };
  return { ok: true, content };
}

/**
 * Ask for a JSON object, walking the provider chain until one answers.
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
  const chain = providerChain();
  if (chain.length === 0) return null;

  // A free tier answers a 30-token prompt in ~13 s, so a 2 000-token outline
  // needs room. Cutting it off at 90 s spent a whole attempt budget on replies
  // that were still arriving.
  const timeoutMs = options.timeoutMs ?? 120_000;
  const plan = chain.flatMap((provider) => provider.models.map((model) => ({ provider, model })));

  let budget = ATTEMPT_BUDGET;

  for (const [index, step] of plan.entries()) {
    const started = Date.now();
    let retried = false;

    while (budget > 0) {
      budget -= 1;
      const attempt = await throttled(() => post(step.provider, step.model, options, timeoutMs));

      if (attempt.ok) {
        try {
          return {
            value: extractJson(attempt.content),
            model: step.model,
            ms: Date.now() - started,
            provider: step.provider.id,
            fellBack: index > 0,
          };
        } catch {
          break; // Parsed nothing: this model is not going to do better on a retry.
        }
      }

      if (attempt.fatal) break; // Bad key — skip this provider's other models too.

      // A missing status is a network or timeout failure, which is worth one
      // retry for the same reason a 5xx is.
      const worthRetrying = attempt.status === 429 || (attempt.status ?? 500) >= 500;
      if (retried || !worthRetrying || budget === 0) break;

      retried = true;
      // Respect the server's own number; if it gave none, back off harder than
      // the normal gap because a 429 means we are already too close.
      await sleep(attempt.retryAfterMs ?? Math.max(minGapMs() * 3, 8_000));
    }
  }

  return null;
}
