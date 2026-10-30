"use client";

import { useEffect } from "react";

/**
 * Transitional interaction layer.
 *
 * The five screens that still come straight from the prototype (studio, learn,
 * insights, path, landing) rely on the vanilla behaviours in
 * prototype/js/app.js: segmented controls, the generation log, the test runner,
 * the staged hint, the tutor registers and the path builder.
 *
 * Rather than rewrite those screens in React — they belong to R2, R4 and R5 and
 * are scheduled for their own weeks — this mounts the same behaviour once for
 * the whole app. It is deliberately imperative: it looks up the ids and
 * data-attributes the prototype already emits. Delete this file when the last
 * ported screen is replaced by a real component.
 */

declare global {
  interface Window {
    praxisToast?: (message: string) => void;
  }
}

export default function PrototypeScripts() {
  useEffect(() => {
    const cleanups: Array<() => void> = [];

    /* segmented controls */
    document.querySelectorAll<HTMLElement>("[data-seg]").forEach((group) => {
      const onClick = (event: Event) => {
        const target = event.target as HTMLElement;
        const button = target.closest("button");
        if (!button || !group.contains(button)) return;
        group.querySelectorAll("button").forEach((b) => b.classList.remove("on"));
        button.classList.add("on");
        const key = group.getAttribute("data-seg");
        const value = button.getAttribute("data-val") || button.textContent?.trim();
        document.querySelectorAll<HTMLElement>(`[data-seg-target="${key}"]`).forEach((el) => {
          el.hidden = el.getAttribute("data-val") !== value;
        });
      };
      group.addEventListener("click", onClick);
      cleanups.push(() => group.removeEventListener("click", onClick));
    });

    /*
     * The generation log used to be simulated here: click #genBtn, fade the
     * outline, light up the log steps, print "Draft ready · 5 modules".
     *
     * That block is gone because /studio is real now. Leaving it in was not
     * harmless — it attached its own click handler to the same #genBtn, so
     * pressing the button ran the animation *instead of* the server action and
     * overwrote the real result with the canned text. A fake that wins the race
     * against the real thing is worse than no fake at all.
     */

    /* test runner */
    const runTests = document.getElementById("runTests") as HTMLButtonElement | null;
    if (runTests) {
      const results = document.getElementById("testResults");
      const badge = document.getElementById("testsBadge");
      const passing = [
        '<div><span class="dim">$ npm test -- validation</span></div>',
        '<div><span class="ok">✓</span> rejects an empty email <span class="dim">(3 ms)</span></div>',
        '<div><span class="ok">✓</span> rejects an email without @ <span class="dim">(2 ms)</span></div>',
        '<div><span class="ok">✓</span> keeps a valid address untouched <span class="dim">(2 ms)</span></div>',
        '<div style="margin-top:6px"><span class="ok">Tests: 3 passed, 3 total</span> <span class="dim">· coverage 94% on users/</span></div>',
      ].join("");
      const onClick = () => {
        runTests.disabled = true;
        if (results) results.innerHTML = '<div><span class="dim">$ npm test -- validation</span></div><div class="dim">running 3 specs…</div>';
        if (badge) {
          badge.className = "pill";
          badge.textContent = "Running";
        }
        window.setTimeout(() => {
          if (results) results.innerHTML = passing;
          if (badge) {
            badge.className = "pill pill-teal";
            badge.textContent = "3 / 3 passing";
          }
          runTests.disabled = false;
          window.praxisToast?.("Checkpoint reached — Module 3.3 unlocked");
        }, 1100);
      };
      runTests.addEventListener("click", onClick);
      cleanups.push(() => runTests.removeEventListener("click", onClick));
    }

    /* staged reveal */
    document.querySelectorAll<HTMLButtonElement>("[data-reveal]").forEach((btn) => {
      const onClick = () => {
        const target = document.getElementById(btn.getAttribute("data-reveal") || "");
        if (!target) return;
        target.hidden = false;
        btn.disabled = true;
        btn.textContent = btn.getAttribute("data-done") || "Shown";
      };
      btn.addEventListener("click", onClick);
      cleanups.push(() => btn.removeEventListener("click", onClick));
    });

    /* tutor registers */
    const tutorText = document.getElementById("tutorText");
    const tutorFoot = document.getElementById("tutorFoot");
    if (tutorText) {
      const copy: Record<string, string> = {
        intro:
          "A <b>validation rule</b> is a guard clause: it stops bad data before it reaches your database, so every later bug you would have hunted is prevented once, up front. Here the agent should add the rule <em>and</em> the test that proves it.",
        analogy:
          'Think of a bouncer at a door. The rule does not make the party better, it stops the wrong people from getting in. In code, the door is your <span class="mono">createUser()</span> function.',
        formal:
          '<b>Precondition contract.</b> Specify the invariant <span class="mono">email ≠ ∅ ∧ email ∈ RFC5322</span>, then implement a total function returning <span class="mono">Result&lt;User, ValidationError&gt;</span> rather than throwing. Verify with a property-based test over generated inputs.',
      };
      const foot: Record<string, string> = {
        intro: "Grounded in Lecture 03 §2.2 · Definition of Done checklist",
        analogy: "Grounded in Lecture 03 §2.2 · Analogy library v3",
        formal: "Grounded in Lecture 03 §4.1 · Contracts & invariants",
      };
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-tutor]"));
      const handlers = buttons.map((btn) => {
        const onClick = () => {
          const key = btn.getAttribute("data-tutor") || "intro";
          tutorText.innerHTML = copy[key] || copy.intro;
          if (tutorFoot) tutorFoot.innerHTML = `<span>◈</span> ${foot[key] || foot.intro}`;
        };
        btn.addEventListener("click", onClick);
        return () => btn.removeEventListener("click", onClick);
      });
      cleanups.push(...handlers);
    }

    /* path builder */
    const buildPath = document.getElementById("buildPath") as HTMLButtonElement | null;
    if (buildPath) {
      const items = Array.from(document.querySelectorAll<HTMLElement>(".tl-item"));
      const timers: number[] = [];
      const onClick = () => {
        buildPath.disabled = true;
        buildPath.textContent = "Designing your path…";
        items.forEach((el) => (el.style.opacity = ".25"));
        items.forEach((el, i) => {
          timers.push(window.setTimeout(() => (el.style.opacity = "1"), 220 + i * 260));
        });
        timers.push(
          window.setTimeout(() => {
            buildPath.disabled = false;
            buildPath.textContent = "Regenerate path";
            window.praxisToast?.("4-step path saved to your workspace");
          }, 220 + items.length * 260 + 150),
        );
      };
      buildPath.addEventListener("click", onClick);
      cleanups.push(() => {
        buildPath.removeEventListener("click", onClick);
        timers.forEach((t) => window.clearTimeout(t));
      });
    }

    /* toast */
    window.praxisToast = (message: string) => {
      let toast = document.getElementById("toast");
      if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        toast.style.cssText =
          "position:fixed;left:50%;bottom:26px;transform:translateX(-50%) translateY(8px);" +
          "background:#101828;color:#fff;padding:9px 16px;border-radius:9px;font-size:12.5px;" +
          "box-shadow:0 10px 30px -10px rgba(0,0,0,.5);opacity:0;transition:.25s;z-index:99;";
        document.body.appendChild(toast);
      }
      toast.textContent = message;
      requestAnimationFrame(() => {
        if (!toast) return;
        toast.style.opacity = "1";
        toast.style.transform = "translateX(-50%) translateY(0)";
      });
      window.clearTimeout(Number(toast.dataset.timer));
      const timer = window.setTimeout(() => {
        if (!toast) return;
        toast.style.opacity = "0";
        toast.style.transform = "translateX(-50%) translateY(8px)";
      }, 2400);
      toast.dataset.timer = String(timer);
    };

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return null;
}
