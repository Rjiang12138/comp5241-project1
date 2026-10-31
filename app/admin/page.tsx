import Link from "next/link";
import { Shell } from "@/components/Shell";
import { requireRole } from "@/lib/auth";
import { listCohorts, listInstructors } from "@/lib/store";
import { assignInstructorAction, createCohortAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cohorts — Praxis" };

/**
 * Minimal admin surface.
 *
 * Two jobs only, because two is what the brief implies and what the team can
 * defend in a Q&A: create a class, assign the teacher who owns it. It is
 * reached from the sidebar for the admin role and guarded on the server, so
 * hiding the link is not the access control.
 */

export default async function AdminPage() {
  const session = await requireRole(["admin"], "/admin");
  const cohorts = await listCohorts();
  const instructors = await listInstructors();
  const instructorOptions = instructors.map((i) => ({ value: i.id, label: i.name }));

  return (
    <Shell
      session={session}
      active="admin"
      crumb={
        <>
          <span>Registry</span>
          <span className="sep">/</span>
          <b>Cohorts</b>
        </>
      }
      actions={
        <>
          <Link className="btn btn-sm" href="/courses">
            All courses
          </Link>
          <span className="pill pill-line">{cohorts.length} cohorts</span>
        </>
      }
    >
      <div className="page-head">
        <div>
          <h1>Cohorts &amp; teaching assignments</h1>
          <p>
            {cohorts.length} cohorts · {instructors.length} instructors · Semester 1 2026/27
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 330px", gap: "16px", alignItems: "start" }}>
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Classes</h3>
              <div className="tiny muted" style={{ marginTop: "2px" }}>
                One instructor owns each cohort; students inherit their courses from it.
              </div>
            </div>
          </div>

          <table className="tbl">
            <thead>
              <tr>
                <th style={{ paddingLeft: "20px" }}>Cohort</th>
                <th>Term</th>
                <th>Instructor</th>
                <th>Learners</th>
                <th>Courses</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {cohorts.map((cohort) => (
                <tr key={cohort.id}>
                  <td style={{ paddingLeft: "20px" }}>
                    <b style={{ fontWeight: 600 }}>{cohort.code}</b>
                    <div className="tiny muted">{cohort.name}</div>
                  </td>
                  <td className="muted">{cohort.term}</td>
                  <td>
                    <form action={assignInstructorAction} className="row">
                      <input type="hidden" name="cohortId" value={cohort.id} />
                      {/* Keyed by the current value: an uncontrolled select keeps
                          the value it mounted with, so after "Assign" the row
                          went on showing the previous instructor and the write
                          looked like it had failed. */}
                      <select
                        key={`${cohort.id}:${cohort.instructorId}`}
                        className="select"
                        name="instructorId"
                        defaultValue={cohort.instructorId}
                        style={{ width: "150px", height: "30px", padding: "0 9px", fontSize: "12.5px" }}
                        aria-label={`Instructor for ${cohort.code}`}
                      >
                        {instructorOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button className="btn btn-sm" type="submit">
                        Assign
                      </button>
                    </form>
                  </td>
                  <td>
                    <span className="pill pill-line">{cohort.learnerCount}</span>
                  </td>
                  <td>
                    <span className="pill pill-line">{cohort.courseCount}</span>
                  </td>
                  <td>
                    <span className="tiny muted">since {cohort.createdAt}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="footnote" style={{ margin: "0 20px 16px", borderTop: "1px solid var(--line-2)" }}>
            Assigning an instructor re-points the cohort and every course attached to it. Reassigning does not move
            student progress — that stays on the enrolment.
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-head">
              <h3>Create a cohort</h3>
            </div>
            <div className="card-body">
              <form action={createCohortAction}>
                <div className="field">
                  <label htmlFor="code">Class code</label>
                  <input className="input" id="code" name="code" placeholder="COMP5241 L03" required />
                  <div className="hint">Shown to students and used as the join key.</div>
                </div>
                <div className="field">
                  <label htmlFor="name">Display name</label>
                  <input className="input" id="name" name="name" placeholder="Software Engineering · L03" />
                </div>
                <div className="field">
                  <label htmlFor="term">Term</label>
                  <input className="input" id="term" name="term" defaultValue="2026/27 S1" />
                </div>
                <div className="field">
                  <label htmlFor="instructorId">Assign instructor</label>
                  <select className="select" id="instructorId" name="instructorId" defaultValue={instructors[0]?.id}>
                    {instructorOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button className="btn btn-sm btn-primary" type="submit" style={{ width: "100%", justifyContent: "center" }}>
                  Create cohort
                </button>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>What admin does</h3>
              <span className="pill pill-line">scope</span>
            </div>
            <div className="card-body">
              <div className="step-list">
                <div className="step-item">
                  <span className="n">1</span>
                  <div className="body">
                    <b>Create the class</b>
                    <div className="tiny muted">Code, name and term. One cohort per teaching group.</div>
                  </div>
                </div>
                <div className="step-item">
                  <span className="n">2</span>
                  <div className="body">
                    <b>Assign the teacher</b>
                    <div className="tiny muted">The instructor then owns the course and its cohort view.</div>
                  </div>
                </div>
                <div className="step-item">
                  <span className="n">3</span>
                  <div className="body">
                    <b>Students import themselves</b>
                    <div className="tiny muted">Moodle roster or CSV, driven from the course page.</div>
                  </div>
                </div>
              </div>
              <div className="footnote">
                Deliberately not here: timetabling, cross-department reporting, grade export. The brief asks for a
                usable platform, not an ERP.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
