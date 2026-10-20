/* Praxis prototype — small vanilla interaction layer.
   No build step, no dependencies: the whole prototype runs from the file system. */

(function () {
  'use strict';

  /* ---------------------------------------------------------- segmented */
  document.querySelectorAll('[data-seg]').forEach(function (group) {
    group.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn || !group.contains(btn)) return;
      group.querySelectorAll('button').forEach(function (b) { b.classList.remove('on'); });
      btn.classList.add('on');
      var target = group.getAttribute('data-seg');
      var val = btn.getAttribute('data-val') || btn.textContent.trim();
      document.querySelectorAll('[data-seg-target="' + target + '"]').forEach(function (el) {
        el.hidden = el.getAttribute('data-val') !== val;
      });
      group.dispatchEvent(new CustomEvent('seg:change', { detail: { value: val }, bubbles: true }));
    });
  });

  /* ---------------------------------------------------------- generation log */
  var genBtn = document.getElementById('genBtn');
  if (genBtn) {
    var steps = Array.prototype.slice.call(document.querySelectorAll('.log-step'));
    var status = document.getElementById('genStatus');
    var outline = document.getElementById('outline');

    var run = function () {
      genBtn.disabled = true;
      if (outline) outline.style.opacity = '.35';
      steps.forEach(function (s) { s.classList.add('pending'); });
      if (status) status.textContent = 'Generating…';

      steps.forEach(function (s, i) {
        setTimeout(function () { s.classList.remove('pending'); }, 260 + i * 420);
      });

      setTimeout(function () {
        genBtn.disabled = false;
        if (outline) outline.style.opacity = '1';
        if (status) status.textContent = 'Draft ready · 5 modules · 6 activities · 47 min';
      }, 260 + steps.length * 420 + 200);
    };

    genBtn.addEventListener('click', run);
  }

  /* ---------------------------------------------------------- test runner */
  var runTests = document.getElementById('runTests');
  if (runTests) {
    var results = document.getElementById('testResults');
    var testsBadge = document.getElementById('testsBadge');
    var passed = [
      '<div><span class="dim">$ npm test -- validation</span></div>',
      '<div><span class="ok">✓</span> rejects an empty email <span class="dim">(3 ms)</span></div>',
      '<div><span class="ok">✓</span> rejects an email without @ <span class="dim">(2 ms)</span></div>',
      '<div><span class="ok">✓</span> keeps a valid address untouched <span class="dim">(2 ms)</span></div>',
      '<div style="margin-top:6px"><span class="ok">Tests: 3 passed, 3 total</span> <span class="dim">· coverage 94% on users/</span></div>'
    ].join('');

    runTests.addEventListener('click', function () {
      runTests.disabled = true;
      if (results) results.innerHTML = '<div><span class="dim">$ npm test -- validation</span></div><div class="dim">running 3 specs…</div>';
      if (testsBadge) { testsBadge.className = 'pill'; testsBadge.textContent = 'Running'; }

      setTimeout(function () {
        if (results) results.innerHTML = passed;
        if (testsBadge) { testsBadge.className = 'pill pill-teal'; testsBadge.textContent = '3 / 3 passing'; }
        runTests.disabled = false;
        if (window.praxisToast) window.praxisToast('Checkpoint reached — Module 3.3 unlocked');
      }, 1100);
    });
  }

  /* ---------------------------------------------------------- reveal */
  document.querySelectorAll('[data-reveal]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = document.getElementById(btn.getAttribute('data-reveal'));
      if (!target) return;
      target.hidden = false;
      btn.disabled = true;
      btn.textContent = btn.getAttribute('data-done') || 'Shown';
    });
  });

  /* ---------------------------------------------------------- tutor audience */
  var tutorText = document.getElementById('tutorText');
  var tutorFoot = document.getElementById('tutorFoot');
  if (tutorText) {
    var copy = {
      intro: 'A <b>validation rule</b> is a guard clause: it stops bad data before it reaches your database, so every later bug you would have hunted is prevented once, up front. Here the agent should add the rule <em>and</em> the test that proves it.',
      analogy: 'Think of a bouncer at a door. The rule does not make the party better, it stops the wrong people from getting in. In code, the door is your <span class="mono">createUser()</span> function.',
      formal: '<b>Precondition contract.</b> Specify the invariant <span class="mono">email ≠ ∅ ∧ email ∈ RFC5322</span>, then implement a total function returning <span class="mono">Result&lt;User, ValidationError&gt;</span> rather than throwing. Verify with a property-based test over generated inputs.'
    };
    var foot = {
      intro: 'Grounded in Lecture 03 §2.2 · Definition of Done checklist',
      analogy: 'Grounded in Lecture 03 §2.2 · Analogy library v3',
      formal: 'Grounded in Lecture 03 §4.1 · Contracts & invariants'
    };
    var setTutor = function (key) {
      tutorText.innerHTML = copy[key] || copy.intro;
      if (tutorFoot) tutorFoot.innerHTML = '<span>◈</span> ' + (foot[key] || foot.intro);
    };

    document.querySelectorAll('[data-tutor]').forEach(function (b) {
      b.addEventListener('click', function () { setTutor(b.getAttribute('data-tutor')); });
    });
  }

  /* ---------------------------------------------------------- path builder */
  var buildPath = document.getElementById('buildPath');
  if (buildPath) {
    buildPath.addEventListener('click', function () {
      buildPath.disabled = true;
      buildPath.textContent = 'Designing your path…';
      var items = document.querySelectorAll('.tl-item');
      items.forEach(function (el) { el.style.opacity = '.25'; });
      items.forEach(function (el, i) {
        setTimeout(function () { el.style.opacity = '1'; }, 220 + i * 260);
      });
      setTimeout(function () {
        buildPath.disabled = false;
        buildPath.textContent = 'Regenerate path';
        if (window.praxisToast) window.praxisToast('4-step path saved to your workspace');
      }, 220 + items.length * 260 + 150);
    });
  }

  /* ---------------------------------------------------------- toast */
  window.praxisToast = function (msg) {
    var t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%) translateY(8px);' +
        'background:#101828;color:#fff;padding:9px 16px;border-radius:9px;font-size:12.5px;' +
        'box-shadow:0 10px 30px -10px rgba(0,0,0,.5);opacity:0;transition:.25s;z-index:99;';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    requestAnimationFrame(function () {
      t.style.opacity = '1';
      t.style.transform = 'translateX(-50%) translateY(0)';
    });
    clearTimeout(t._timer);
    t._timer = setTimeout(function () {
      t.style.opacity = '0';
      t.style.transform = 'translateX(-50%) translateY(8px)';
    }, 2400);
  };
})();
