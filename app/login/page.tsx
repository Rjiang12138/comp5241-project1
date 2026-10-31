import Link from "next/link";
import { getSessionOrNull } from "@/lib/auth";
import { listSignableUsers } from "@/lib/store";
import { signInAction, signOutAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in — Praxis" };

function initials(name: string): string {
  return name
    .replace(/^(Dr\.|Prof\.)\s*/i, "")
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const ROLE_PILL: Record<string, { label: string; className: string }> = {
  admin: { label: "Admin", className: "pill pill-amber" },
  instructor: { label: "Instructor", className: "pill pill-brand" },
  learner: { label: "Learner", className: "pill pill-teal" },
};

type Search = { next?: string; need?: string };

/** Only a same-site path is worth returning to; anything else is not a route. */
function safeNext(value?: string): string | undefined {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return undefined;
  if (value === "/login" || value.startsWith("/login?")) return undefined;
  return value;
}

const NEED_COPY: Record<string, string> = {
  staff: "That page is for instructors and admins.",
  admin: "That page is for the registry admin.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const session = await getSessionOrNull();
  const users = await listSignableUsers();
  const staff = users.filter((user) => user.role !== "learner");
  const learners = users.filter((user) => user.role === "learner");
  const next = safeNext(params.next);
  const need = params.need ? NEED_COPY[params.need] : undefined;

  const card = (user: (typeof users)[number]) => (
    <form action={signInAction} key={user.id}>
      <input type="hidden" name="userId" value={user.id} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <button className="signin-card" type="submit" style={{ width: "100%" }}>
        <div className="row">
          <span className="avatar">{initials(user.name)}</span>
          <span className={ROLE_PILL[user.role]?.className ?? "pill"}>{ROLE_PILL[user.role]?.label ?? user.role}</span>
        </div>
        <div className="who">{user.name}</div>
        <div className="tiny muted">{user.email}</div>
      </button>
    </form>
  );

  return (
    <div className="signin-wrap">
      <div className="signin">
        <div className="mk-brand" style={{ marginBottom: "22px" }}>
          <span className="logo-mark">P</span> Praxis
        </div>

        <div className="card card-pad" style={{ marginBottom: "14px" }}>
          <div className="between">
            <div>
              <h1 style={{ fontSize: "19px" }}>Choose a role to continue</h1>
              <p className="muted" style={{ fontSize: "13px", marginTop: "4px" }}>
                {next ? (
                  <>
                    You were heading to <b>{next}</b>. Pick the identity you want to arrive as.
                  </>
                ) : (
                  "The platform has three roles. Each one sees a different shell."
                )}
              </p>
            </div>
            <span className="pill pill-brand">Demo session</span>
          </div>
        </div>

        {need ? (
          <div
            className="card card-pad"
            style={{ marginBottom: "14px", background: "var(--amber-soft)", borderColor: "#fde68a" }}
          >
            <div className="tiny" style={{ lineHeight: 1.6 }}>
              <b>{need}</b> A learner account cannot open it — choose an instructor or admin below to continue, or{" "}
              <Link href="/learn">go back to your learning</Link>.
            </div>
          </div>
        ) : null}

        <div className="side-label" style={{ padding: "0 2px 8px" }}>
          Staff
        </div>
        <div className="signin-grid">{staff.map(card)}</div>

        <div className="side-label" style={{ padding: "18px 2px 8px" }}>
          Learners
        </div>
        <div className="signin-grid">{learners.map(card)}</div>

        <div className="between" style={{ marginTop: "16px" }}>
          <span className="tiny muted">
            {session ? (
              <>
                Signed in as <b>{session.name}</b> · {session.role}
              </>
            ) : (
              "Not signed in yet"
            )}
          </span>
          <div className="row">
            <Link className="btn btn-sm btn-ghost" href="/">
              Back to landing
            </Link>
            {session ? (
              <form action={signOutAction}>
                <button className="btn btn-sm" type="submit">
                  Sign out
                </button>
              </form>
            ) : null}
          </div>
        </div>

        <div className="footnote" style={{ marginTop: "22px" }}>
          No passwords in this build: picking a person writes the same session cookie a real provider would write,
          and every route behind this page reads the role off that cookie on the server. Swapping the provider
          replaces this page, not the pages behind it.
        </div>
      </div>
    </div>
  );
}
