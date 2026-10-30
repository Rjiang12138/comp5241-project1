"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { askTutorAction, completeActivityAction, recordAttemptAction } from "@/app/learn/actions";
import { FORMAT_LABEL, type ActivityContent, type CodeCheck } from "@/lib/activity-content";
import type { ActivityFormat } from "@/lib/types";

/**
 * The learner player.
 *
 * One component for all eight formats, because the alternative — a screen per
 * format — is how a course platform ends up with seven screens that drift apart.
 * The prototype's markup is kept: the same `player-top`, the same three-column
 * body, the same lesson list, the same code block and terminal.
 *
 * What is new is that every number on it is derived from the learner's event
 * log, and every interaction appends to that log rather than to local state.
 */

type PlayerActivity = {
  id: string;
  title: string;
  format: ActivityFormat;
  minutes: number;
  moduleId: string;
  moduleTitle: string;
  moduleObjective: string;
  modulePosition: number;
  indexInModule: number;
  moduleActivityCount: number;
};

type Props = {
  courseId: string;
  courseTitle: string;
  enrollmentId: string;
  learnerName: string;
  learnerBackground: "cs" | "non_cs";
  preview: boolean;
  /** Where the exit arrow goes. Staff return to the editor; a learner to their path. */
  exitHref?: string;
  /** Present only for staff: switches which learner the preview is running as. */
  cyclePreview?: (formData: FormData) => void;
  activity: PlayerActivity;
  content: ActivityContent;
  modules: Array<{ id: string; title: string; activities: Array<{ id: string; title: string }> }>;
  completed: string[];
  attempts: Record<string, number>;
  prevId: string | null;
  nextId: string | null;
  totalActivities: number;
  totalMinutes: number;
  completedMinutes: number;
};

const FORMAT_PILL: Record<ActivityFormat, string> = {
  reading: "pill pill-line",
  quiz: "pill",
  code_lab: "pill pill-teal",
  role_play: "pill pill-amber",
  simulation: "pill pill-brand",
  peer_review: "pill pill-amber",
  game: "pill",
  narrated_slides: "pill",
};

function pct(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

function runChecks(code: string, checks: CodeCheck[]): Array<{ name: string; pass: boolean }> {
  return checks.map((check) => {
    const mustInclude = check.mustInclude ?? [];
    const mustNotInclude = check.mustNotInclude ?? [];
    const included = mustInclude.every((token) => code.includes(token));
    const excluded = mustNotInclude.every((token) => !code.includes(token));
    const nonTrivial = mustInclude.length > 0 || code.trim().length > 20;
    return { name: check.name, pass: included && excluded && nonTrivial };
  });
}

export default function LearnPlayer(props: Props) {
  const {
    courseId,
    courseTitle,
    enrollmentId,
    learnerName,
    learnerBackground,
    preview,
    exitHref,
    cyclePreview,
    activity,
    content,
    modules,
    completed,
    attempts,
    prevId,
    nextId,
    totalActivities,
    totalMinutes,
    completedMinutes,
  } = props;

  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [code, setCode] = useState(content.kind === "code_lab" ? content.starter : "");
  const [checkResults, setCheckResults] = useState<Array<{ name: string; pass: boolean }> | null>(null);
  const [failures, setFailures] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [choice, setChoice] = useState<number | null>(null);
  const [written, setWritten] = useState("");
  const [found, setFound] = useState<string[]>([]);
  const [question, setQuestion] = useState("");
  const [tutor, setTutor] = useState<{ answer: string; source: string; grounded: boolean } | null>(null);
  const [register, setRegister] = useState<"plain" | "analogy" | "formal">("plain");
  const [done, setDone] = useState(completed.includes(activity.id));

  const position = useMemo(() => {
    let seen = 0;
    for (const module of modules) {
      for (const item of module.activities) {
        seen += 1;
        if (item.id === activity.id) return seen;
      }
    }
    return 1;
  }, [modules, activity.id]);

  const quizScore = content.kind === "quiz"
    ? content.questions.reduce((sum, q, index) => sum + (quizAnswers[index] === q.answer ? 1 : 0), 0)
    : 0;

  const quizReady = content.kind === "quiz" && quizSubmitted && quizScore === content.questions.length;

  function advance() {
    const target = nextId ?? activity.id;
    router.push(`/learn?course=${courseId}&activity=${target}`);
    router.refresh();
  }

  function complete(payload?: { response?: string; score?: { correct: number; total: number } }) {
    startTransition(async () => {
      const result = await completeActivityAction({
        enrollmentId,
        activityId: activity.id,
        courseId,
        ...payload,
      });
      if (result.ok) {
        setDone(true);
        if (nextId) advance();
        else router.refresh();
      }
    });
  }

  function attempt(passed: number, total: number) {
    void recordAttemptAction({ enrollmentId, activityId: activity.id, courseId, passed, total });
  }

  function ask() {
    const text = question.trim();
    if (text.length < 3) return;
    startTransition(async () => {
      const answer = await askTutorAction({ enrollmentId, activityId: activity.id, courseId, question: text });
      setTutor(answer);
      setQuestion("");
    });
  }

  const canComplete =
    content.kind === "reading"
      ? true
      : content.kind === "quiz"
        ? quizReady
        : content.kind === "code_lab"
          ? (checkResults?.every((check) => check.pass) ?? false)
          : content.kind === "simulation"
            ? choice !== null
            : content.kind === "role_play" || content.kind === "peer_review"
              ? written.trim().length > 20 || found.length > 0
              : written.trim().length > 0;

  const progress = pct(completed.length, totalActivities);

  // The adaptation rule the page claims to apply: a non-CS learner gets the hint
  // after one failed attempt, a CS learner after two. It used to be copy only —
  // the button was always live — which is a rule that exists in the paragraph
  // and not in the product.
  const hintThreshold = learnerBackground === "non_cs" ? 1 : 2;
  const hintUnlocked = (attempts[activity.id] ?? 0) + failures >= hintThreshold;

  return (
    <>
      <div className="player-top">
        <a className="exit" href={exitHref ?? `/courses/${courseId}`} title="Back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M15 5l-7 7 7 7" /></svg>
        </a>
        <div>
          <div className="player-title">{courseTitle}</div>
          <div className="player-sub">
            Activity {position} of {totalActivities} · {FORMAT_LABEL[activity.format]}
          </div>
        </div>

        <div className="player-progress">
          <div className="progress" style={{ width: "150px" }}><i style={{ width: `${progress}%` }}></i></div>
          <span className="tiny muted">{progress}%</span>
        </div>

        <div style={{ marginLeft: "auto" }} className="row">
          <span className="pill pill-line">
            <span className="dot" style={{ background: preview ? "#f79009" : "#12b76a" }}></span>
            {preview ? `Previewing as ${learnerName}` : "Autosaved"}
          </span>
          {preview && cyclePreview ? (
            <form action={cyclePreview}>
              <input type="hidden" name="courseId" value={courseId} />
              <button className="btn btn-sm btn-ghost" type="submit" title="Preview the course as the next enrolled learner">
                Next learner
              </button>
            </form>
          ) : null}
          <span className="pill pill-brand">{learnerBackground === "cs" ? "CS track" : "Non-CS track"}</span>
          <a className="btn btn-sm" href="/path">My path</a>
        </div>
      </div>

      <div className="player-body">
        <div className="stack">
          <div className="card card-pad">
            <div className="between">
              <div className="eyebrow">Course progress</div>
              <span className="tiny muted">{completed.length} / {totalActivities}</span>
            </div>
            <div className="progress mt-8" style={{ height: "7px" }}><i style={{ width: `${progress}%` }}></i></div>
            <div className="tiny muted mt-8">
              {completedMinutes} of {totalMinutes} min done · {nextId ? "next activity unlocked" : "last activity"}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3 style={{ fontSize: "12.5px" }}>Your path</h3>
              <span className="tiny muted">{totalMinutes} min</span>
            </div>
            <div className="card-body" style={{ padding: "8px" }}>
              {modules.map((module, moduleIndex) => {
                const allDone = module.activities.every((item) => completed.includes(item.id));
                return (
                  <div key={module.id}>
                    <div className="side-label" style={{ padding: "10px 9px 4px" }}>
                      Module {moduleIndex + 1} · {allDone ? "done" : module.activities.some((item) => completed.includes(item.id)) ? "in progress" : "not started"}
                    </div>
                    <div className="lesson-list">
                      {module.activities.map((item, itemIndex) => {
                        const isDone = completed.includes(item.id);
                        const isNow = item.id === activity.id;
                        return (
                          <a
                            key={item.id}
                            href={`/learn?course=${courseId}&activity=${item.id}`}
                            className={isDone ? "ok" : isNow ? "now" : undefined}
                          >
                            <span className="n">{moduleIndex + 1}.{itemIndex + 1}</span> {item.title}
                            {isDone ? <span style={{ marginLeft: "auto", color: "#12b76a" }}>✓</span> : null}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card card-pad">
            <div className="eyebrow">This page adapts to you</div>
            <div className="tiny muted mt-8" style={{ lineHeight: "1.6" }}>
              {learnerBackground === "cs"
                ? "You are on the CS track, so explanations lead with the formal rule and the hint waits until you have tried twice."
                : "You are on the non-CS track, so explanations start with an analogy and the hint appears after one failed attempt."}
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-head">
              <div className="row">
                <span className={FORMAT_PILL[activity.format]}>{FORMAT_LABEL[activity.format]}</span>
                <span className="tiny muted">
                  {activity.minutes} min · Module {activity.modulePosition}.{activity.indexInModule}
                </span>
              </div>
              <div className="row">
                {done ? <span className="pill pill-teal">completed</span> : null}
                {attempts[activity.id] ? (
                  <span className="tiny muted">{attempts[activity.id]} attempt{attempts[activity.id] === 1 ? "" : "s"} recorded</span>
                ) : null}
              </div>
            </div>

            <div className="card-body">
              <h2 style={{ fontSize: "19px", letterSpacing: "-.02em" }}>{activity.title}</h2>
              <p className="muted mt-8" style={{ fontSize: "13px", maxWidth: "640px" }}>
                {activity.moduleObjective}
              </p>

              {/* ---------------------------------------------------- reading */}
              {content.kind === "reading" ? (
                <div style={{ marginTop: "18px", display: "flex", flexDirection: "column", gap: "14px", maxWidth: "660px" }}>
                  {content.blocks.map((block, index) => (
                    <div key={index}>
                      {block.heading ? (
                        <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>{block.heading}</div>
                      ) : null}
                      <div style={{ fontSize: "13.4px", lineHeight: 1.7, color: "var(--ink-2)" }}>{block.text}</div>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* ------------------------------------------------------- quiz */}
              {content.kind === "quiz" ? (
                <div style={{ marginTop: "18px", display: "flex", flexDirection: "column", gap: "18px" }}>
                  {content.questions.map((item, index) => {
                    const picked = quizAnswers[index];
                    return (
                      <div key={index}>
                        <div style={{ fontSize: "13.2px", fontWeight: 600, marginBottom: "8px" }}>
                          {index + 1}. {item.prompt}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {item.options.map((option, optionIndex) => {
                            const isPicked = picked === optionIndex;
                            const isRight = quizSubmitted && optionIndex === item.answer;
                            const isWrong = quizSubmitted && isPicked && optionIndex !== item.answer;
                            return (
                              <button
                                key={optionIndex}
                                type="button"
                                className="btn btn-sm"
                                onClick={() => !quizSubmitted && setQuizAnswers({ ...quizAnswers, [index]: optionIndex })}
                                style={{
                                  justifyContent: "flex-start",
                                  textAlign: "left",
                                  whiteSpace: "normal",
                                  background: isRight ? "var(--teal-soft)" : isWrong ? "var(--rose-soft)" : isPicked ? "var(--brand-soft)" : undefined,
                                  borderColor: isRight ? "#99f6e4" : isWrong ? "#fecdd3" : undefined,
                                }}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                        {quizSubmitted ? (
                          <div className="tiny muted" style={{ marginTop: "6px", lineHeight: 1.6 }}>
                            {item.explain}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  {!quizSubmitted ? (
                    <button
                      className="btn btn-primary btn-sm"
                      type="button"
                      disabled={Object.keys(quizAnswers).length < content.questions.length}
                      onClick={() => {
                        setQuizSubmitted(true);
                        const score = content.questions.reduce(
                          (sum, item, index) => sum + (quizAnswers[index] === item.answer ? 1 : 0),
                          0,
                        );
                        attempt(score, content.questions.length);
                      }}
                    >
                      Check answers
                    </button>
                  ) : (
                    <div className="tiny muted">
                      {quizScore} of {content.questions.length} correct
                      {quizScore === content.questions.length ? " — you can mark this complete." : " — review the explanations, then try the next activity."}
                    </div>
                  )}
                </div>
              ) : null}

              {/* --------------------------------------------------- code lab */}
              {content.kind === "code_lab" ? (
                <div style={{ marginTop: "16px" }}>
                  <p className="muted" style={{ fontSize: "13px", maxWidth: "640px" }}>{content.brief}</p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", margin: "16px 0" }}>
                    {content.task.map((step, index) => (
                      <div className="task-step" key={index}>
                        <span className="num">{index + 1}</span>
                        <div>{step}</div>
                      </div>
                    ))}
                  </div>

                  <textarea
                    className="textarea mono"
                    value={code}
                    onChange={(event) => {
                      setCode(event.target.value);
                      setCheckResults(null);
                    }}
                    spellCheck={false}
                    style={{ minHeight: "190px", fontFamily: "var(--mono)", fontSize: "12px", lineHeight: 1.6 }}
                  />

                  <div className="row mt-12">
                    <button
                      className="btn btn-primary btn-sm"
                      type="button"
                      onClick={() => {
                        const results = runChecks(code, content.checks);
                        setCheckResults(results);
                        if (!results.every((r) => r.pass)) setFailures((count) => count + 1);
                        attempt(results.filter((r) => r.pass).length, results.length);
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                      Run checks
                    </button>
                    <button
                      className="btn btn-sm"
                      type="button"
                      disabled={showHint || !hintUnlocked}
                      title={
                        hintUnlocked
                          ? "Show the first hint"
                          : `The hint unlocks after ${hintThreshold} failed attempt${hintThreshold === 1 ? "" : "s"} on this activity`
                      }
                      onClick={() => {
                        setShowHint(true);
                        void recordAttemptAction({ enrollmentId, activityId: activity.id, courseId, kind: "hint" });
                      }}
                    >
                      {showHint ? "Hint shown" : hintUnlocked ? "Ask for a hint" : `Hint after ${hintThreshold} attempt${hintThreshold === 1 ? "" : "s"}`}
                    </button>
                    <button className="btn btn-sm btn-ghost" type="button" onClick={() => setShowSolution(true)}>
                      Show solution
                    </button>
                    <span className="tiny muted" style={{ marginLeft: "auto" }}>
                      Checks are literal assertions over your text — not a runtime.
                    </span>
                  </div>

                  {checkResults ? (
                    <div className="term mt-12">
                      {checkResults.map((result) => (
                        <div key={result.name}>
                          <span className={result.pass ? "ok" : "bad"}>{result.pass ? "✓" : "✗"}</span> {result.name}
                        </div>
                      ))}
                      <div style={{ marginTop: "6px" }}>
                        <span className={checkResults.every((r) => r.pass) ? "ok" : "bad"}>
                          {checkResults.filter((r) => r.pass).length} passed, {checkResults.filter((r) => !r.pass).length} failed
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {showHint ? (
                    <div className="hint-box mt-12">
                      <b>Hint 1 of 2.</b> {content.hint}
                    </div>
                  ) : null}

                  {showSolution ? (
                    <div className="hint-box mt-12" style={{ background: "#fbfbfd", borderColor: "var(--line-2)" }}>
                      <div className="tiny muted" style={{ marginBottom: "6px" }}>A worked answer — compare, do not paste.</div>
                      <pre className="mono" style={{ fontSize: "11.5px", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{content.solution}</pre>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* ------------------------------------------------ simulation */}
              {content.kind === "simulation" ? (
                <div style={{ marginTop: "16px" }}>
                  <p className="muted" style={{ fontSize: "13px", maxWidth: "640px", lineHeight: 1.7 }}>{content.situation}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "16px" }}>
                    {content.options.map((option, index) => {
                      const picked = choice === index;
                      return (
                        <button
                          key={index}
                          type="button"
                          className="btn btn-sm"
                          onClick={() => {
                            setChoice(index);
                            attempt(option.good ? 1 : 0, 1);
                          }}
                          style={{
                            justifyContent: "flex-start",
                            textAlign: "left",
                            whiteSpace: "normal",
                            padding: "10px 12px",
                            background: picked ? (option.good ? "var(--teal-soft)" : "var(--rose-soft)") : undefined,
                          }}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                  {choice !== null ? (
                    <div className="hint-box mt-12" style={{ background: content.options[choice].good ? "var(--teal-soft)" : "var(--amber-soft)", borderColor: "transparent" }}>
                      {content.options[choice].outcome}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* ------------------------------------------------- role play */}
              {content.kind === "role_play" ? (
                <div style={{ marginTop: "16px" }}>
                  <p className="muted" style={{ fontSize: "13px", maxWidth: "640px", lineHeight: 1.7 }}>{content.scenario}</p>
                  <div className="tutor mt-12">
                    <div className="tutor-msg">
                      <div>{content.opening}</div>
                    </div>
                  </div>
                  <textarea
                    className="textarea mt-12"
                    placeholder="Your reply — the reviewer will push back on anything vague."
                    value={written}
                    onChange={(event) => setWritten(event.target.value)}
                    style={{ minHeight: "110px" }}
                  />
                  <div className="card card-pad mt-12" style={{ background: "#fbfbfd" }}>
                    <div className="eyebrow" style={{ marginBottom: "8px" }}>What a good answer contains</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {content.rubric.map((item, index) => (
                        <div key={index} className="tiny muted" style={{ lineHeight: 1.6 }}>· {item}</div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* ---------------------------------------------- peer review */}
              {content.kind === "peer_review" ? (
                <div style={{ marginTop: "16px" }}>
                  <p className="muted" style={{ fontSize: "13px", maxWidth: "640px" }}>{content.instruction}</p>
                  <pre
                    className="mono mt-12"
                    style={{
                      fontSize: "11.8px",
                      lineHeight: 1.7,
                      background: "#0f172a",
                      color: "#e2e8f0",
                      padding: "14px",
                      borderRadius: "10px",
                      whiteSpace: "pre-wrap",
                      margin: 0,
                    }}
                  >
                    {content.diff}
                  </pre>
                  <div className="eyebrow mt-12" style={{ marginBottom: "8px" }}>Mark what you would not merge</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {content.findings.map((finding) => {
                      const isFound = found.includes(finding.marker);
                      return (
                        <button
                          key={finding.marker}
                          type="button"
                          className="btn btn-sm"
                          onClick={() =>
                            setFound(isFound ? found.filter((item) => item !== finding.marker) : [...found, finding.marker])
                          }
                          style={{
                            justifyContent: "flex-start",
                            textAlign: "left",
                            whiteSpace: "normal",
                            padding: "10px 12px",
                            background: isFound ? "var(--amber-soft)" : undefined,
                          }}
                        >
                          <span className="mono" style={{ marginRight: "8px" }}>{finding.marker}</span>
                          {isFound ? finding.note : "— tap to record this finding"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* ------------------------------------------------ reflection */}
              {content.kind === "reflection" ? (
                <div style={{ marginTop: "16px" }}>
                  <p className="muted" style={{ fontSize: "13px", maxWidth: "640px" }}>{content.prompt}</p>
                  <textarea
                    className="textarea mt-12"
                    value={written}
                    onChange={(event) => setWritten(event.target.value)}
                    style={{ minHeight: "120px" }}
                  />
                </div>
              ) : null}
            </div>

            <div className="card-body" style={{ borderTop: "1px solid var(--line-2)", background: "#fbfbfd", borderRadius: "0 0 12px 12px" }}>
              <div className="between">
                <div className="tiny muted">
                  {done
                    ? "Recorded in the event log. Progress on /insights updates from here."
                    : canComplete
                      ? "Ready to complete."
                      : content.kind === "quiz"
                        ? "Answer every question and check them to unlock completion."
                        : content.kind === "code_lab"
                          ? "Run the checks until they all pass."
                          : "Do the task above, then mark it complete."}
                </div>
                <div className="row">
                  <a className={`btn btn-sm${prevId ? "" : " btn-ghost"}`} href={prevId ? `/learn?course=${courseId}&activity=${prevId}` : undefined} aria-disabled={!prevId}>
                    Back
                  </a>
                  <button
                    className="btn btn-sm btn-primary"
                    type="button"
                    disabled={pending || done || !canComplete}
                    onClick={() =>
                      complete({
                        response:
                          content.kind === "role_play" || content.kind === "reflection"
                            ? written
                            : content.kind === "code_lab"
                              ? code
                              : content.kind === "peer_review"
                                ? found.join(" | ")
                                : undefined,
                        score: content.kind === "quiz" ? { correct: quizScore, total: content.questions.length } : undefined,
                      })
                    }
                  >
                    {done ? "Completed" : pending ? "Saving…" : nextId ? "Complete and continue →" : "Complete"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-head">
              <div className="row">
                <span className="logo-mark sm" style={{ width: "19px", height: "19px", fontSize: "9px" }}>P</span>
                <h3 style={{ fontSize: "12.5px" }}>AI tutor</h3>
              </div>
              <span className="pill pill-line">{tutor?.grounded === false ? "refused" : "grounded"}</span>
            </div>
            <div className="card-body">
              <div className="seg" style={{ width: "100%", marginBottom: "12px" }}>
                {(["plain", "analogy", "formal"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={register === option ? "on" : undefined}
                    style={{ flex: "1" }}
                    onClick={() => setRegister(option)}
                  >
                    {option === "plain" ? "Plain" : option === "analogy" ? "Analogy" : "Formal"}
                  </button>
                ))}
              </div>

              <div className="tutor">
                <div className="tutor-msg">
                  <div>
                    {tutor
                      ? tutor.answer
                      : "Ask about anything in this activity. I answer from the material on this page, and I say so when the answer is not in it."}
                  </div>
                  <div className="src">
                    <span>◈</span> {tutor ? tutor.source : `${activity.moduleTitle} · ${FORMAT_LABEL[activity.format]}`}
                  </div>
                </div>

                <div>
                  <div className="eyebrow" style={{ marginBottom: "7px" }}>Ask about this step</div>
                  <div className="wrap">
                    {[
                      activity.moduleObjective.split(" ").slice(0, 4).join(" ") + "?",
                      "What would a good answer look like?",
                    ].map((suggestion) => (
                      <button key={suggestion} type="button" className="btn btn-sm" onClick={() => setQuestion(suggestion)}>
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                <form
                  className="ask"
                  onSubmit={(event) => {
                    event.preventDefault();
                    ask();
                  }}
                >
                  <span className="mono" style={{ fontSize: "11px" }}>/</span>
                  <input
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="Ask anything about this activity…"
                    style={{ border: 0, background: "transparent", outline: "none", flex: 1, fontSize: "12.4px" }}
                  />
                  <button type="submit" className="btn btn-sm" disabled={pending}>
                    ↵
                  </button>
                </form>
              </div>
            </div>
            <div className="card-body" style={{ borderTop: "1px solid var(--line-2)", paddingTop: "11px" }}>
              <div className="tiny muted" style={{ lineHeight: "1.55" }}>
                The tutor only answers from this activity's material. Every question is written to the event log, so
                refusals are auditable rather than invisible.
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Mastery</h3>
              <span className="tiny muted">this course</span>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {modules.map((module) => {
                const finished = module.activities.filter((item) => completed.includes(item.id)).length;
                const total = module.activities.length;
                const tone = finished === total ? "pill pill-teal" : finished > 0 ? "pill pill-amber" : "pill";
                const label = finished === total ? "Solid" : finished > 0 ? "Developing" : "Not started";
                return (
                  <div className="between" key={module.id}>
                    <div style={{ fontSize: "12.6px" }}>{module.title}</div>
                    <div className="row">
                      <span className={tone}>{label}</span>
                      <span className="tiny muted">{finished}/{total}</span>
                    </div>
                  </div>
                );
              })}
              <div className="divider"></div>
              <div className="tiny muted">Mastery moves only when you finish an activity — reading time alone does not count.</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
