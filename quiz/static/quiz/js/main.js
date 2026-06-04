/* ============================================================
   資料結構測驗網站 — Quiz Page JavaScript
   ============================================================ */

(function () {
  "use strict";

  /* ── Timer ──────────────────────────────────────────────── */
  function startTimer(totalSeconds, displayEl, onExpire) {
    let remaining = totalSeconds;

    function tick() {
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      displayEl.textContent =
        String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
      displayEl.classList.toggle("red", remaining < 60);

      if (remaining <= 0) {
        onExpire();
        return;
      }
      remaining--;
      setTimeout(tick, 1000);
    }

    tick();
  }

  /* ── Quiz controller ────────────────────────────────────── */
  window.QuizController = (function () {
    const LETTERS = ["A", "B", "C", "D", "E"];
    let currentIdx = 0;
    let total = 0;
    let answered = []; // null | true | false per question
    let questionEls = [];
    let dotEls = [];
    let submitted = false;

    function init() {
      questionEls = Array.from(document.querySelectorAll(".question-wrapper"));
      dotEls      = Array.from(document.querySelectorAll(".qnav-dot"));
      total = questionEls.length;
      answered = new Array(total).fill(null);

      if (!total) return;

      showQuestion(0);
      updateProgress();

      // keyboard shortcuts
      document.addEventListener("keydown", function (e) {
        // a/s/d/f/g → select option A/B/C/D/E
        var keyMap = { KeyA: 0, KeyS: 1, KeyD: 2, KeyF: 3, KeyG: 4 };
        if (Object.prototype.hasOwnProperty.call(keyMap, e.code)) {
          e.preventDefault();
          var btns = questionEls[currentIdx].querySelectorAll(".option");
          var btn  = btns[keyMap[e.code]];
          if (btn && !btn.disabled) btn.click();
        }
        // Enter → next question
        if (e.key === "Enter") {
          e.preventDefault();
          var nextBtn = document.getElementById("btn-next");
          if (nextBtn && !nextBtn.disabled) nextBtn.click();
        }
        // ← → navigate
        if (e.key === "ArrowRight") {
          var nextBtn2 = document.getElementById("btn-next");
          if (nextBtn2 && !nextBtn2.disabled) nextBtn2.click();
        }
        if (e.key === "ArrowLeft") {
          var prevBtn = document.getElementById("btn-prev");
          if (prevBtn && !prevBtn.disabled) prevBtn.click();
        }
      });

      // timer
      const timerEl   = document.getElementById("timer-display");
      const timeLimitEl = document.getElementById("time-limit-value");
      if (timerEl && timeLimitEl) {
        const limit = parseInt(timeLimitEl.value, 10) || 900;
        startTimer(limit, timerEl, function () { submitQuiz(); });
      }
    }

    function showQuestion(idx) {
      questionEls.forEach(function (el, i) {
        el.style.display = i === idx ? "block" : "none";
      });
      dotEls.forEach(function (d, i) {
        d.classList.remove("current");
        if (i === idx) d.classList.add("current");
      });

      const prevBtn = document.getElementById("btn-prev");
      const nextBtn = document.getElementById("btn-next");
      const status  = document.getElementById("quiz-status");

      if (prevBtn) prevBtn.disabled = (idx === 0);
      if (nextBtn) {
        nextBtn.disabled = (answered[idx] === null);
        nextBtn.textContent = (idx === total - 1) ? "完成測驗 →" : "下一題 →";
      }
      if (status) status.textContent = answered[idx] !== null ? "已作答" : "請選擇答案";

      currentIdx = idx;
      updateProgress();
    }

    function selectOption(btn, choiceId, correctId, hint) {
      const wrapper = btn.closest(".question-wrapper");
      if (wrapper.dataset.answered) return;
      wrapper.dataset.answered = "1";

      const isCorrect = (choiceId === correctId);
      answered[currentIdx] = isCorrect;

      // set hidden radio
      const radioId = "radio_" + wrapper.dataset.qid + "_" + choiceId;
      const radio = document.getElementById(radioId);
      if (radio) radio.checked = true;

      // style all buttons
      const allBtns = wrapper.querySelectorAll(".option");
      allBtns.forEach(function (b) {
        b.disabled = true;
        const cid = parseInt(b.dataset.choiceId, 10);
        if (cid === correctId) {
          b.classList.add("correct");
          b.querySelector(".opt-mark").textContent = "✓";
        } else if (cid === choiceId && !isCorrect) {
          b.classList.add("wrong");
          b.querySelector(".opt-mark").textContent = "✗";
        } else {
          b.classList.add("faded");
        }
      });

      // feedback
      const fb = wrapper.querySelector(".feedback");
      if (fb) {
        fb.className = "feedback " + (isCorrect ? "ok" : "err");
        fb.querySelector(".feedback-icon").textContent   = isCorrect ? "✓" : "✗";
        fb.querySelector(".feedback-title").textContent  = isCorrect ? "答對了！" : "答錯了！";
        fb.querySelector(".feedback-hint").textContent   = hint || "";
      }

      // update dot
      const dot = dotEls[currentIdx];
      if (dot) {
        dot.classList.remove("current");
        dot.classList.add(isCorrect ? "dot-correct" : "dot-wrong");
        // re-apply current class so it stays highlighted
        dot.classList.add("current");
      }

      // enable next button
      const nextBtn = document.getElementById("btn-next");
      if (nextBtn) nextBtn.disabled = false;
      const status = document.getElementById("quiz-status");
      if (status) status.textContent = "已作答";
    }

    function gotoPrev() {
      if (currentIdx > 0) showQuestion(currentIdx - 1);
    }

    function gotoNext() {
      if (currentIdx < total - 1) {
        showQuestion(currentIdx + 1);
      } else {
        submitQuiz();
      }
    }

    function submitQuiz() {
      if (submitted) return;
      submitted = true;
      document.getElementById("quiz-form").submit();
    }

    function updateProgress() {
      const fill = document.getElementById("progress-fill");
      if (fill) {
        fill.style.width = ((currentIdx + 1) / total * 100) + "%";
      }
      const counter = document.getElementById("q-counter");
      if (counter) {
        counter.textContent =
          String(currentIdx + 1).padStart(2, "0") + " / " + total;
      }
    }

    return { init, showQuestion, selectOption, gotoPrev, gotoNext, submitQuiz };
  })();

  // auto-init when DOM ready
  document.addEventListener("DOMContentLoaded", function () {
    if (document.getElementById("quiz-form")) {
      window.QuizController.init();
    }
  });
})();
