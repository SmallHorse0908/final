/* ============================================================
   資料結構測驗網站 — Quiz Engine (JSON-driven, Spaced Repetition)
   ============================================================ */

(function () {
  "use strict";

  /* ── Constants ──────────────────────────────────────────── */
  var LETTERS = ["A", "B", "C", "D", "E"];
  var SR_OFFSET = 3;

  /* ── State ──────────────────────────────────────────────── */
  var queue = [];           // active question queue (grows with SR)
  var idx = 0;
  var firstAnswers = {};    // qid → choice_id (first attempt, locked)
  var queueAnswered = {};   // queue index → { choiceId, isCorrect }
  var masteredQids = {};    // qid → true (answered correctly at least once)
  var submitted = false;
  var totalOriginal = 0;    // original pool size
  var spacedRep = false;

  /* ── Timer ──────────────────────────────────────────────── */
  function startTimer(seconds, displayEl, onExpire) {
    var remaining = seconds;
    function tick() {
      var m = Math.floor(remaining / 60);
      var s = remaining % 60;
      displayEl.textContent = pad(m) + ":" + pad(s);
      displayEl.classList.toggle("red", remaining < 60);
      if (remaining <= 0) { onExpire(); return; }
      remaining--;
      setTimeout(tick, 1000);
    }
    tick();
  }

  function pad(n) { return String(n).padStart(2, "0"); }

  /* ── Mastery helpers ────────────────────────────────────── */
  function masteredCount() { return Object.keys(masteredQids).length; }

  function pendingCount() {
    var remaining = queue.length - idx - (queueAnswered[idx] ? 1 : 0);
    return Math.max(0, remaining);
  }

  /* ── Build question card DOM ────────────────────────────── */
  function buildCard(q, queueIdx) {
    var prev = queueAnswered[queueIdx];
    var isAnswered = !!prev;

    // Header label
    var headerLabel = "QUESTION " + pad(queueIdx + 1);
    var headerEl = document.createElement("div");
    headerEl.className = "qhead";

    var qnumEl = document.createElement("span");
    qnumEl.className = "qnum";
    qnumEl.textContent = headerLabel;

    if (q.is_custom) {
      var customTag = document.createElement("span");
      customTag.className = "tag tag-amber";
      customTag.style.marginLeft = "8px";
      customTag.textContent = "本組設計";
      qnumEl.appendChild(customTag);
    }
    if (q.isRepeat) {
      var repeatTag = document.createElement("span");
      repeatTag.className = "tag tag-amber";
      repeatTag.style.marginLeft = "8px";
      repeatTag.textContent = "↻ 第 " + (q.attemptNum || 2) + " 次嘗試";
      qnumEl.appendChild(repeatTag);
    }

    var resultTagEl = document.createElement("span");
    resultTagEl.className = "q-result-tag";
    resultTagEl.style.display = isAnswered ? "" : "none";

    headerEl.appendChild(qnumEl);
    headerEl.appendChild(resultTagEl);

    // Stem
    var stemEl = document.createElement("div");
    stemEl.className = "qstem";
    stemEl.textContent = q.stem;
    if (q.block) {
      var codeEl = document.createElement("code");
      codeEl.className = "qstem-block";
      codeEl.textContent = q.block;
      stemEl.appendChild(codeEl);
    }

    // Options
    var optionsEl = document.createElement("div");
    optionsEl.className = "options";
    q.choices.forEach(function (choice, ci) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option";
      btn.dataset.choiceId = choice.id;

      var letterEl = document.createElement("span");
      letterEl.className = "opt-letter";
      letterEl.textContent = LETTERS[ci] || String(ci + 1);

      var textEl = document.createElement("span");
      textEl.className = "opt-text";
      textEl.textContent = choice.text;

      var markEl = document.createElement("span");
      markEl.className = "opt-mark";

      btn.appendChild(letterEl);
      btn.appendChild(textEl);
      btn.appendChild(markEl);

      if (isAnswered) {
        btn.disabled = true;
        if (choice.id === q.correct_id) {
          btn.classList.add("correct"); markEl.textContent = "✓";
        } else if (choice.id === prev.choiceId && !prev.isCorrect) {
          btn.classList.add("wrong"); markEl.textContent = "✗";
        } else {
          btn.classList.add("faded");
        }
      } else {
        btn.addEventListener("click", function () { handleAnswer(queueIdx, choice.id); });
      }

      optionsEl.appendChild(btn);
    });

    // Feedback (only after answering)
    var fbEl = document.createElement("div");
    fbEl.className = "feedback";
    if (isAnswered) {
      fbEl.className = "feedback " + (prev.isCorrect ? "ok" : "err");

      var fbIcon = document.createElement("div");
      fbIcon.className = "feedback-icon";
      fbIcon.textContent = prev.isCorrect ? "✓" : "✗";

      var fbBody = document.createElement("div");
      fbBody.className = "feedback-body";

      var fbTitle = document.createElement("div");
      fbTitle.className = "feedback-title";
      if (prev.isCorrect) {
        fbTitle.textContent = q.isRepeat ? "這次答對了！" : "答對了！";
      } else {
        var correctIdx = q.choices.findIndex(function (c) { return c.id === q.correct_id; });
        var correctLetter = LETTERS[correctIdx] || "?";
        fbTitle.textContent = "答錯，正解為 " + correctLetter + (spacedRep ? "（稍後會再考一次）" : "");
      }

      var fbHint = document.createElement("div");
      fbHint.className = "feedback-hint";
      fbHint.textContent = q.hint || "";

      fbBody.appendChild(fbTitle);
      fbBody.appendChild(fbHint);
      fbEl.appendChild(fbIcon);
      fbEl.appendChild(fbBody);

      // Result tag
      resultTagEl.className = "q-result-tag tag " + (prev.isCorrect ? "tag-green" : "tag-red");
      resultTagEl.textContent = prev.isCorrect ? "✓ 正確" : "✗ 錯誤";
      resultTagEl.style.display = "";
    }

    // Assemble card
    var card = document.createElement("div");
    card.className = "qcard";
    card.appendChild(headerEl);
    card.appendChild(stemEl);
    card.appendChild(optionsEl);
    card.appendChild(fbEl);

    // Wrapper
    var wrapper = document.createElement("div");
    wrapper.className = "question-wrapper";
    wrapper.id = "q" + queueIdx;
    wrapper.dataset.qid = q.id;
    wrapper.appendChild(card);
    return wrapper;
  }

  /* ── Render current question ────────────────────────────── */
  function renderQuestion() {
    var root = document.getElementById("quiz-root");
    if (!root) return;
    root.innerHTML = "";
    root.appendChild(buildCard(queue[idx], idx));
    updateUI();
  }

  /* ── Update all UI state ────────────────────────────────── */
  function updateUI() {
    var isAnswered = !!queueAnswered[idx];
    var mc = masteredCount();
    var pc = pendingCount();

    // Mastery counter
    var masteredEl = document.getElementById("q-mastered");
    if (masteredEl) masteredEl.textContent = mc;

    // Total
    var totalEl = document.getElementById("q-total");
    if (totalEl) totalEl.textContent = " / " + totalOriginal;

    // Pending (SR)
    var pendingEl = document.getElementById("q-pending");
    if (pendingEl) {
      if (spacedRep && pc > 0) {
        pendingEl.textContent = "+" + pc + " 待重做";
        pendingEl.style.display = "";
      } else {
        pendingEl.style.display = "none";
      }
    }

    // Progress bar (mastery-based)
    var fill = document.getElementById("progress-fill");
    if (fill) {
      fill.style.width = (totalOriginal ? mc / totalOriginal * 100 : 0) + "%";
    }

    // Status text
    var status = document.getElementById("quiz-status");
    if (status) status.textContent = isAnswered ? "已作答" : "請選擇答案";

    // Buttons
    var prevBtn = document.getElementById("btn-prev");
    var nextBtn = document.getElementById("btn-next");
    if (prevBtn) prevBtn.disabled = (idx === 0);
    if (nextBtn) {
      nextBtn.disabled = !isAnswered;
      var isLast = (idx === queue.length - 1);
      var currentCorrect = isAnswered && queueAnswered[idx].isCorrect;
      var showFinish = isLast && (!spacedRep || currentCorrect);
      nextBtn.textContent = showFinish ? "完成測驗 →" : "下一題 →";
    }

    // Nav dots
    rebuildDots();
  }

  /* ── Rebuild nav dots ───────────────────────────────────── */
  function rebuildDots() {
    var nav = document.getElementById("qnav");
    if (!nav) return;
    nav.innerHTML = "";
    queue.forEach(function (q, i) {
      var dot = document.createElement("span");
      dot.className = "qnav-dot";
      dot.textContent = pad(i + 1);

      if (i === idx) dot.classList.add("current");
      if (q.isRepeat) dot.classList.add("repeat");

      var ans = queueAnswered[i];
      if (ans) dot.classList.add(ans.isCorrect ? "dot-correct" : "dot-wrong");

      // Only allow clicking back (already visited)
      if (i <= idx) {
        dot.addEventListener("click", function () { goToQuestion(i); });
      } else {
        dot.style.cursor = "default";
        dot.style.opacity = "0.5";
      }

      nav.appendChild(dot);
    });
  }

  /* ── Handle answer ──────────────────────────────────────── */
  function handleAnswer(queueIdx, choiceId) {
    if (queueAnswered[queueIdx]) return;

    var q = queue[queueIdx];
    var isCorrect = (choiceId === q.correct_id);

    queueAnswered[queueIdx] = { choiceId: choiceId, isCorrect: isCorrect };

    // Track mastery (any correct attempt counts)
    if (isCorrect) masteredQids[q.id] = true;

    // Lock first-attempt answer in hidden form input (never overwrite)
    if (!(q.id in firstAnswers)) {
      firstAnswers[q.id] = choiceId;
      setHiddenAnswer(q.id, choiceId);
    }

    // Spaced repetition: re-insert wrong answers
    if (spacedRep && !isCorrect) {
      var insertAt = Math.min(queueIdx + 1 + SR_OFFSET, queue.length);
      var repeat = Object.assign({}, q, {
        choices: shuffleArray(q.choices.slice()),
        isRepeat: true,
        attemptNum: (q.attemptNum || 1) + 1,
      });
      queue.splice(insertAt, 0, repeat);
    }

    renderQuestion();
  }

  /* ── Set hidden form input for first-try answer ─────────── */
  function setHiddenAnswer(qid, choiceId) {
    var form = document.getElementById("quiz-form");
    if (!form) return;
    var name = "question_" + qid;
    var el = form.querySelector('input[name="' + name + '"]');
    if (!el) {
      el = document.createElement("input");
      el.type = "hidden";
      el.name = name;
      form.appendChild(el);
    }
    el.value = choiceId;
  }

  /* ── Navigation ─────────────────────────────────────────── */
  function goToQuestion(i) { idx = i; renderQuestion(); }
  function gotoPrev() { if (idx > 0) goToQuestion(idx - 1); }
  function gotoNext() {
    if (!queueAnswered[idx]) return;
    if (idx + 1 < queue.length) {
      goToQuestion(idx + 1);
    } else {
      submitQuiz();
    }
  }

  /* ── Submit ─────────────────────────────────────────────── */
  function submitQuiz() {
    if (submitted) return;
    submitted = true;
    var form = document.getElementById("quiz-form");

    // Pass all eventually-correct question IDs so server can tag SR successes
    var ecEl = document.createElement("input");
    ecEl.type = "hidden";
    ecEl.name = "eventually_correct";
    ecEl.value = Object.keys(masteredQids).join(",");
    form.appendChild(ecEl);

    form.submit();
  }

  /* ── Fisher-Yates shuffle ───────────────────────────────── */
  function shuffleArray(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  /* ── Keyboard shortcuts ─────────────────────────────────── */
  var KEY_MAP = { KeyA: 0, KeyS: 1, KeyD: 2, KeyF: 3, KeyG: 4 };

  function handleKey(e) {
    if (Object.prototype.hasOwnProperty.call(KEY_MAP, e.code)) {
      e.preventDefault();
      var wrapper = document.getElementById("q" + idx);
      if (!wrapper) return;
      var btns = wrapper.querySelectorAll(".option:not([disabled])");
      var btn = btns[KEY_MAP[e.code]];
      if (btn) btn.click();
    }
    if (e.key === "Enter" || e.key === "ArrowRight") {
      e.preventDefault();
      var nextBtn = document.getElementById("btn-next");
      if (nextBtn && !nextBtn.disabled) nextBtn.click();
    }
    if (e.key === "ArrowLeft") {
      var prevBtn = document.getElementById("btn-prev");
      if (prevBtn && !prevBtn.disabled) prevBtn.click();
    }
  }

  /* ── Init ───────────────────────────────────────────────── */
  function init() {
    var form = document.getElementById("quiz-form");
    if (!form) return;

    var raw = window.QUIZ_DATA || [];
    spacedRep = window.QUIZ_SPACED_REP === true;
    totalOriginal = raw.length;

    queue = raw.map(function (q) {
      return Object.assign({}, q, { isRepeat: false, attemptNum: 1 });
    });

    if (!queue.length) return;

    document.getElementById("btn-prev").addEventListener("click", gotoPrev);
    document.getElementById("btn-next").addEventListener("click", gotoNext);
    document.addEventListener("keydown", handleKey);

    var btnConfirm = document.getElementById("btn-submit-confirm");
    if (btnConfirm) {
      btnConfirm.addEventListener("click", function () {
        if (confirm("確定要結束作答嗎？")) submitQuiz();
      });
    }

    var timerEl = document.getElementById("timer-display");
    var limitEl = document.getElementById("time-limit-value");
    if (timerEl && limitEl) {
      startTimer(parseInt(limitEl.value, 10) || 900, timerEl, function () { submitQuiz(); });
    }

    renderQuestion();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
