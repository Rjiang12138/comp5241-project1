import { Shell } from "@/components/Shell";
import StudioWorkspace from "@/components/StudioWorkspace";
import { requireStaff } from "@/lib/auth";
import { llmConfigured, llmProviderLabel } from "@/lib/llm";
import { lastTouchedCourse, listCourses } from "@/lib/store";

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

/**
 * The studio.
 *
 * This screen used to render a component generated from `prototype/studio.html`
 * — a second, hand-maintained copy of the sidebar that counted courses by
 * typing "6" into the markup. It now uses the same `Shell` as every other
 * screen, so the counts come from the database and there is one place to change
 * the navigation.
 */
export default async function StudioPage() {
  const session = await requireStaff("/studio");
  const [last, courses] = await Promise.all([lastTouchedCourse(session.userId), listCourses()]);

  // Printed in the page head so the screen never claims to be model-backed when
  // no key is configured — the same honesty the generation log enforces. When a
  // key is present this names the provider that will actually be asked first.
  const model = llmConfigured() ? llmProviderLabel() : "template-v1";

  return (
    <Shell
      session={session}
      active="studio"
      courseCount={courses.length}
      crumb={
        <>
          <span>Studio</span>
          <span className="sep">/</span>
          <span>New mini-course</span>
          <span className="sep">/</span>
          <b>Draft</b>
        </>
      }
      actions={
        <>
          {last ? (
            <span className="pill pill-line">
              <span className="dot" style={{ background: "#12b76a" }} />
              Saved {ago(last.updatedAt)}
            </span>
          ) : (
            <span className="pill pill-line">
              <span className="dot" style={{ background: "#98a2b3" }} />
              Nothing saved yet
            </span>
          )}
          <a className="btn btn-sm" href={last ? `/courses/${last.id}` : "/courses"}>
            {last ? "Open editor" : "All courses"}
          </a>
          <a className="btn btn-primary btn-sm" href={last ? `/courses/${last.id}` : "/courses"}>
            {last ? "Review & publish" : "New course"}
          </a>
        </>
      }
    >
      <div className="page-head">
        <div>
          <h1>Design a mini-course</h1>
          <p>Start from your own material or from a topic. You stay in control of every module.</p>
        </div>
        <div className="row">
          <span className="pill pill-brand">AI-assisted draft</span>
          <span className="pill pill-line">Model: {model}</span>
        </div>
      </div>

      <StudioWorkspace />
    </Shell>
  );
}
