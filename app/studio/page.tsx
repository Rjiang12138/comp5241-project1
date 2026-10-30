import Studio from "@/components/ported/Studio";
import { getSession } from "@/lib/auth";
import { llmConfigured } from "@/lib/llm";

export const metadata = { title: "Studio — Praxis" };

export default async function StudioPage() {
  const session = await getSession();
  // Shown in the page head so the screen never claims to be model-backed when
  // no key is configured — the same honesty the generation log enforces.
  const model = llmConfigured() ? (process.env.OPENROUTER_MODEL ?? "free-tier chain") : "template-v1";
  return <Studio session={session} model={model} />;
}
