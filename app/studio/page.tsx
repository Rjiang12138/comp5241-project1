import Studio from "@/components/ported/Studio";
import { requireStaff } from "@/lib/auth";
import { llmConfigured } from "@/lib/llm";
import { lastTouchedCourse } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata = { title: "Studio — Praxis" };

function ago(date: Date): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

export default async function StudioPage() {
  const session = await requireStaff();
  // Shown in the page head so the screen never claims to be model-backed when
  // no key is configured — the same honesty the generation log enforces.
  const model = llmConfigured() ? (process.env.OPENROUTER_MODEL ?? "free-tier chain") : "template-v1";
  const last = await lastTouchedCourse(session.userId);
  return (
    <Studio
      session={session}
      model={model}
      draft={
        last
          ? { id: last.id, title: last.title, status: last.status, when: ago(last.updatedAt) }
          : null
      }
    />
  );
}
