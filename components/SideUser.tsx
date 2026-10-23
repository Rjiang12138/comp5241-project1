import Link from "next/link";
import type { Session } from "@/lib/auth";

/**
 * The signed-in block at the foot of the sidebar.
 *
 * The prototype hard-coded "Dr. R. Kwok · Instructor" here because it had no
 * session. Once the app grew real roles, that copy became a lie the moment
 * anyone switched to admin — the ported screens kept showing the instructor
 * while the real screens showed the admin, which reads as "the app changed my
 * identity". One component, one source of truth.
 */
export default function SideUser({ session }: { session: Session }) {
  return (
    <Link className="side-user" href="/login">
      <span className="avatar">{session.initials}</span>
      <div style={{ lineHeight: 1.25 }}>
        <div style={{ fontSize: "12.5px", fontWeight: 600 }}>{session.name}</div>
        <div className="tiny muted">{session.label}</div>
      </div>
    </Link>
  );
}
