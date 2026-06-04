/* 頁面元件 — Home, ChapterIntro, Quiz, Result, History, Leaderboard, Review, Admin */

const { useState: useStateP, useEffect: useEffectP, useMemo: useMemoP, useRef: useRefP } = React;

/* ============================================
   HOME
   ============================================ */
function HomePage({ go }) {
  const history = lsGet(LS_KEYS.history, []);
  const ch6History = history.filter(h => h.chapter === 6);
  const bestScore = ch6History.length ? Math.max(...ch6History.map(h => h.score)) : 0;
  const totalQuestions = getAllQuestions().length;

  return (
    <Page label="01 Home">
      <section className="hero">
        <h1 className="hero-title">
          資料結構<br/>主題測驗系統
        </h1>
        <p className="hero-sub">
          以課堂題庫為基礎的線上測驗平台。
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
          <button className="btn btn-primary btn-lg" onClick={() => go("/chapter/6")}>
            ▸ 立刻開始測驗
          </button>
          <button className="btn btn-lg" onClick={() => go("/leaderboard")}>
            查看排行榜
          </button>
        </div>
      </section>

      <StatsStrip items={[
        { label: "題目數",     value: totalQuestions, unit: "題" },
        { label: "預估時長",   value: 15, unit: "分鐘" },
        { label: "歷史嘗試",   value: ch6History.length, unit: "次" },
        { label: "個人最佳",   value: bestScore, unit: "分" },
      ]}/>

      <SectionHead title="chapter / 本期測驗章節" meta="linear/stack_queue"/>
      <ChapterList go={go}/>

      <SectionHead title="features / 系統功能" meta="MTV架構 · Django"/>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 0,
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        background: "var(--bg-elev)",
      }}>
        {[
          { k: "[01]", t: "隨機出題", d: "每次重新洗牌題目順序，避免背題目位置" },
          { k: "[02]", t: "隨機選項", d: "選項位置亂數排列，後端記錄正解對應" },
          { k: "[03]", t: "即時回饋", d: "學習模式：作答後立刻顯示對錯與解析" },
          { k: "[04]", t: "倒數計時", d: "依題數動態配置，時間到自動交卷" },
          { k: "[05]", t: "歷史成績", d: "localStorage 保存每次作答紀錄" },
          { k: "[06]", t: "排行榜",   d: "依分數與作答時間排序 Top 10" },
          { k: "[07]", t: "錯題複習", d: "自動蒐集錯題建立專屬複習題組" },
          { k: "[08]", t: "後台管理", d: "Django Admin 題庫 CRUD 操作介面" },
        ].map((f, i) => (
          <div key={i} style={{
            padding: "20px 22px",
            borderRight: (i % 4 !== 3) ? "1px solid var(--border)" : "none",
            borderBottom: i < 4 ? "1px solid var(--border)" : "none",
          }}>
            <div className="mono" style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 8 }}>{f.k}</div>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>{f.t}</div>
            <div className="mono" style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.5 }}>{f.d}</div>
          </div>
        ))}
      </div>
    </Page>
  );
}

function ChapterList({ go }) {
  return (
    <div className="chapter-grid">
      {window.CHAPTERS.map(ch => (
        <div
          key={ch.id}
          className={"chapter-row" + (ch.available ? "" : " locked")}
          onClick={() => ch.available && go(`/chapter/${ch.id}`)}
        >
          <span className="chapter-num">ch.{String(ch.id).padStart(2, "0")}</span>
          <div>
            <div className="chapter-name">第 {ch.id} 章　{ch.title}</div>
            <div className="chapter-desc">{ch.desc}</div>
          </div>
          <span className="chapter-meta">
            {ch.count} 題　
            {ch.available
              ? <span className="tag tag-green">已開放</span>
              : <span className="tag">建置中</span>
            }
          </span>
          <span className="chapter-arrow">{ch.available ? "→" : "·"}</span>
        </div>
      ))}
    </div>
  );
}

/* ============================================
   CHAPTERS LIST PAGE
   ============================================ */
function ChaptersPage({ go }) {
  return (
    <Page label="02 Chapters">
      <div style={{ padding: "12px 0 32px" }}>
        <div className="hero-prompt">$ ls ./chapters/</div>
        <h1 className="hero-title" style={{ fontSize: 38 }}>章節列表</h1>
        <p className="hero-sub">本學期期末專題範圍：第 6 章「堆疊與佇列」。</p>
      </div>
      <ChapterList go={go}/>
    </Page>
  );
}

/* ============================================
   CHAPTER INTRO
   ============================================ */
function ChapterIntroPage({ go, chapterId }) {
  const ch = window.CHAPTERS.find(c => c.id === Number(chapterId));
  const history = lsGet(LS_KEYS.history, []).filter(h => h.chapter === Number(chapterId));
  const last = history[history.length - 1];
  const best = history.length ? Math.max(...history.map(h => h.score)) : null;
  const totalBank = getAllQuestions().length;

  // 測驗設定
  const [questionCount, setQuestionCount] = useStateP(() => Math.min(15, totalBank));
  const [spacedRep, setSpacedRep] = useStateP(true);

  function startQuiz() {
    window.QUIZ_CONFIG = {
      n: Math.min(questionCount, totalBank),
      sr: spacedRep,
    };
    go(`/quiz/${ch.id}`);
  }

  if (!ch) return <Page label="Chapter"><Empty>章節不存在</Empty></Page>;

  const presets = [5, 10, 15].filter(n => n <= totalBank);
  const minutes = Math.max(3, Math.ceil(questionCount * 1));

  return (
    <Page label={`03 Ch${ch.id} Intro`}>
      <div className="mono" style={{ color: "var(--text-dim)", fontSize: 13, marginBottom: 24 }}>
        <span onClick={() => go("/chapters")} style={{ cursor: "pointer" }}>~/chapters</span>
        <span> / </span>
        <span className="cyan">ch.{String(ch.id).padStart(2, "0")}</span>
      </div>

      <TerminalPanel title={`chapter_${String(ch.id).padStart(2, "0")} / ${ch.desc}.py`} right={
        ch.available ? <span className="tag tag-green">READY</span> : <span className="tag">BUILDING</span>
      }>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 32, alignItems: "start" }}>
          <div>
            <div className="mono" style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 8 }}>
              # chapter title
            </div>
            <h1 style={{ fontSize: 44, margin: "0 0 16px", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              第 {ch.id} 章　{ch.title}
            </h1>
            <p style={{ color: "var(--text-muted)", maxWidth: 560, marginBottom: 8, fontSize: 15 }}>
              本章涵蓋線性資料結構中的「堆疊」(LIFO) 與「佇列」(FIFO)，包含基本操作、時間複雜度、
              環狀佇列、雙向佇列，以及它們在迷宮搜尋、運算式轉換等實際應用。
            </p>

            <div className="settings-panel">
              <div className="mono" style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
                # 測驗設定
              </div>

              <div className="settings-row">
                <span className="settings-label">題數</span>
                <div className="seg">
                  {presets.map(n => (
                    <button key={n} className={questionCount === n ? "active" : ""} onClick={() => setQuestionCount(n)}>
                      {n} 題
                    </button>
                  ))}
                  <button
                    className={questionCount === totalBank && !presets.includes(totalBank) ? "active" : (questionCount === totalBank ? "active" : "")}
                    onClick={() => setQuestionCount(totalBank)}
                  >
                    全部 ({totalBank})
                  </button>
                </div>
                <span className="settings-help">約 {minutes} 分鐘</span>
              </div>

              <div className="settings-row">
                <span className="settings-label">間隔學習法</span>
                <div
                  className={"toggle " + (spacedRep ? "on" : "")}
                  onClick={() => setSpacedRep(s => !s)}
                  role="switch"
                  aria-checked={spacedRep}
                >
                  <span className="toggle-track"></span>
                  <span className="toggle-label">{spacedRep ? "已啟用" : "關閉"}</span>
                </div>
                <span className="settings-help">答錯的題目會在後面再次出現，直到答對為止</span>
              </div>
            </div>
          </div>
          <div style={{ width: 220 }}>
            <div className="mono" style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>歷史紀錄</div>
            {history.length === 0 ? (
              <div className="notice">尚未作答過此章節</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div className="mono dim" style={{ fontSize: 11 }}>最佳分數</div>
                  <div className="mono" style={{ fontSize: 28, fontWeight: 600 }}>{best}<span className="dim" style={{ fontSize: 14 }}> / 100</span></div>
                </div>
                <div>
                  <div className="mono dim" style={{ fontSize: 11 }}>上次作答</div>
                  <div className="mono" style={{ fontSize: 14 }}>{last.date}</div>
                </div>
                <div>
                  <div className="mono dim" style={{ fontSize: 11 }}>嘗試次數</div>
                  <div className="mono" style={{ fontSize: 14 }}>{history.length} 次</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </TerminalPanel>

      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <button className="btn btn-primary btn-lg" disabled={!ch.available} onClick={startQuiz}>
          ▸ 開始作答　·　{questionCount} 題{spacedRep ? "　·　間隔學習" : ""}
        </button>
        <button className="btn btn-lg" onClick={() => go("/chapters")}>
          ← 回到章節列表
        </button>
      </div>

      <SectionHead title="topics / 章節主題"/>
      <div className="chapter-grid">
        {[
          ["LIFO / FIFO 定義", "Stack 與 Queue 的基本特性與差異"],
          ["基本操作", "Push / Pop / Enqueue / Dequeue 與時間複雜度"],
          ["環狀佇列", "Circular Queue 的滿與空判斷條件"],
          ["雙向佇列", "Deque：兩端皆可進行 insert / delete"],
          ["迷宮搜尋", "DFS 使用堆疊，BFS 使用佇列"],
          ["運算式轉換", "中序轉後序、後序式求值的堆疊應用"],
        ].map(([t, d], i) => (
          <div key={i} className="chapter-row" style={{ cursor: "default" }}>
            <span className="chapter-num">{String(i+1).padStart(2,"0")}</span>
            <div>
              <div className="chapter-name">{t}</div>
              <div className="chapter-desc">{d}</div>
            </div>
            <span className="chapter-meta"></span>
            <span></span>
          </div>
        ))}
      </div>
    </Page>
  );
}

/* ============================================
   QUIZ
   ============================================ */
function QuizPage({ go, chapterId }) {
  const ch = window.CHAPTERS.find(c => c.id === Number(chapterId));
  const bank = getAllQuestions();
  const config = window.QUIZ_CONFIG || { n: Math.min(15, bank.length), sr: true };
  const targetN = Math.min(config.n, bank.length);
  const sr = !!config.sr;

  // 初始抽題：從題庫取 targetN 題，每題打散選項
  const [initialPool] = useStateP(() => {
    return shuffle(bank).slice(0, targetN).map(q => ({
      ...q,
      shuffledOptions: shuffle(q.options),
      attemptNum: 1,
    }));
  });

  // queue 可在 SR 模式下成長
  const [queue, setQueue] = useStateP(initialPool);
  const [idx, setIdx] = useStateP(0);
  // attempts: 與 queue 平行，attempts[i] = { qid, selectedKey, isCorrect } 或 undefined
  const [attempts, setAttempts] = useStateP([]);
  const [startTime] = useStateP(() => Date.now());
  const [timeLeft, setTimeLeft] = useStateP(() => Math.max(180, targetN * 60));

  // 倒數計時
  useEffectP(() => {
    const t = setInterval(() => {
      setTimeLeft(s => {
        if (s <= 1) { clearInterval(t); submitQuiz(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  // eslint-disable-next-line
  }, []);

  const current = queue[idx];
  const currentAttempt = attempts[idx];
  const isAnswered = !!currentAttempt;
  const isCorrect = isAnswered && currentAttempt.isCorrect;
  const selectedKey = currentAttempt?.selectedKey;

  // 計算已掌握（每個 qid 是否最終答對）與還剩多少題
  const status = useMemoP(() => {
    const byQid = {};
    attempts.forEach(a => {
      if (!a) return;
      if (!byQid[a.qid]) byQid[a.qid] = { eventuallyCorrect: false, firstCorrect: a.isCorrect };
      if (a.isCorrect) byQid[a.qid].eventuallyCorrect = true;
    });
    const uniqueQids = [...new Set(queue.map(q => q.id))];
    const mastered = uniqueQids.filter(id => byQid[id]?.eventuallyCorrect).length;
    const totalUnique = initialPool.length;
    const pending = queue.length - idx - (isAnswered ? 1 : 0);
    return { mastered, totalUnique, pending: Math.max(0, pending) };
  }, [attempts, queue, idx, isAnswered, initialPool.length]);

  function selectOption(key) {
    if (isAnswered) return;
    const isC = key === current.answer;
    const newAttempt = { qid: current.id, selectedKey: key, isCorrect: isC };
    setAttempts(arr => {
      const next = [...arr];
      next[idx] = newAttempt;
      return next;
    });
  }

  function gotoNext() {
    if (!isAnswered) return;
    let newQueue = queue;
    // 間隔學習：答錯就把該題重新插入到稍後的位置
    if (sr && !currentAttempt.isCorrect) {
      const offset = 3; // 約 3 題後再次出現
      const insertAt = Math.min(idx + 1 + offset, queue.length);
      const repeated = {
        ...current,
        shuffledOptions: shuffle(current.options),
        attemptNum: (current.attemptNum || 1) + 1,
        isRepeat: true,
      };
      newQueue = [...queue.slice(0, insertAt), repeated, ...queue.slice(insertAt)];
      setQueue(newQueue);
    }
    if (idx + 1 < newQueue.length) {
      setIdx(idx + 1);
    } else {
      submitQuiz(newQueue);
    }
  }

  function gotoPrev() { if (idx > 0) setIdx(idx - 1); }

  function submitQuiz(finalQueue) {
    const q = finalQueue || queue;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);

    // 每個 unique qid 的：第一次嘗試 / 是否最終答對 / 嘗試次數
    const byQid = {};
    attempts.forEach((a, i) => {
      if (!a) return;
      if (!byQid[a.qid]) {
        byQid[a.qid] = { first: a, count: 1, eventuallyCorrect: a.isCorrect };
      } else {
        byQid[a.qid].count++;
        if (a.isCorrect) byQid[a.qid].eventuallyCorrect = true;
      }
    });

    // 分數 = 第一次就答對的題數 / 目標題數
    const firstTryCorrect = Object.values(byQid).filter(x => x.first.isCorrect).length;
    const totalUnique = initialPool.length;
    const score = Math.round(firstTryCorrect / totalUnique * 100);

    const details = initialPool.map(qx => {
      const info = byQid[qx.id] || {};
      const userAnswer = info.first?.selectedKey ?? null;
      return {
        id: qx.id,
        stem: qx.stem,
        block: qx.block,
        options: qx.shuffledOptions,
        hint: qx.hint,
        correctAnswer: qx.answer,
        userAnswer,
        firstTryCorrect: info.first?.isCorrect || false,
        eventuallyCorrect: info.eventuallyCorrect || false,
        attemptsCount: info.count || 0,
      };
    });

    const result = {
      chapter: Number(chapterId),
      chapterTitle: ch?.title || "",
      score,
      correctCount: firstTryCorrect,
      total: totalUnique,
      totalAttempts: attempts.filter(Boolean).length,
      spacedRepetition: sr,
      timeSpent: elapsed,
      date: new Date().toLocaleString("zh-TW", { hour12: false }).replace(/\//g, "/"),
      details,
    };
    const history = lsGet(LS_KEYS.history, []);
    history.push(result);
    lsSet(LS_KEYS.history, history);
    window.LAST_RESULT = result;
    go("/result");
  }

  return (
    <Page label={`04 Quiz Ch${chapterId}`}>
      <div className="quiz-top">
        <div>
          <span className="dim">ch.{String(chapterId).padStart(2,"0")}</span>
          <span className="dim"> / </span>
          <span>{ch?.title}</span>
          {sr && <span className="tag tag-amber" style={{ marginLeft: 12 }}>↻ 間隔學習</span>}
        </div>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <span>
            <span className="dim">已掌握 </span>
            <span className="green" style={{ fontWeight: 600 }}>{status.mastered}</span>
            <span className="dim"> / {status.totalUnique}</span>
            {sr && status.pending > 0 && (
              <span className="amber mono" style={{ marginLeft: 8, fontSize: 12 }}>+{status.pending} 待重做</span>
            )}
          </span>
          <span>
            <span className="dim">⏱ </span>
            <span className={timeLeft < 60 ? "red" : ""} style={{ fontWeight: 600 }}>{formatTime(timeLeft)}</span>
          </span>
          <button className="btn btn-sm btn-ghost" onClick={() => { if (confirm("確定要結束作答嗎？")) submitQuiz(); }}>
            交卷
          </button>
        </div>
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${status.totalUnique ? status.mastered / status.totalUnique * 100 : 0}%` }}></div>
      </div>

      <div className="qnav">
        {queue.map((q, i) => {
          const a = attempts[i];
          let cls = "qnav-dot";
          if (i === idx) cls += " current";
          else if (a) cls += a.isCorrect ? " correct" : " wrong";
          if (q.isRepeat) cls += " repeat";
          return (
            <span key={i} className={cls} onClick={() => i <= idx && setIdx(i)} title={q.isRepeat ? "重做" : ""}>
              {String(i+1).padStart(2,"0")}
            </span>
          );
        })}
      </div>

      <div className="qcard">
        <div className="qhead">
          <span className="qnum">
            QUESTION {String(idx+1).padStart(2,"0")} · {current.id}
            {current.custom && <span className="tag tag-amber" style={{ marginLeft: 8 }}>本組設計</span>}
            {current.isRepeat && <span className="tag tag-amber" style={{ marginLeft: 8 }}>↻ 第 {current.attemptNum} 次嘗試</span>}
          </span>
          {isAnswered && (
            isCorrect
              ? <span className="tag tag-green">✓ 正確</span>
              : <span className="tag tag-red">✗ 錯誤</span>
          )}
        </div>

        <div className="qstem">
          {current.stem}
          {current.block && <code className="qstem-block">{current.block}</code>}
        </div>

        <div className="options">
          {current.shuffledOptions.map(opt => {
            const isSelected = selectedKey === opt.key;
            const isAnswer = opt.key === current.answer;
            let cls = "option";
            if (isAnswered) {
              if (isAnswer) cls += " correct";
              else if (isSelected) cls += " wrong";
              else cls += " faded";
            } else if (isSelected) cls += " selected";

            const mark = isAnswered ? (isAnswer ? "✓" : (isSelected ? "✗" : "")) : "";
            return (
              <button key={opt.key} className={cls} onClick={() => selectOption(opt.key)} disabled={isAnswered}>
                <span className="opt-letter">{opt.key}</span>
                <span className="opt-text">{opt.text}</span>
                <span className="opt-mark">{mark}</span>
              </button>
            );
          })}
        </div>

        {isAnswered && (
          <div className={"feedback " + (isCorrect ? "ok" : "err")}>
            <div className="feedback-icon">{isCorrect ? "✓" : "✗"}</div>
            <div className="feedback-text">
              <div className="feedback-title">
                {isCorrect
                  ? (current.isRepeat ? "這次答對了！" : "答對了！")
                  : `答錯，正解為 ${current.answer}${sr ? "（稍後會再考一次）" : ""}`}
              </div>
              <div className="muted">{current.hint}</div>
            </div>
          </div>
        )}
      </div>

      <div className="quiz-actions">
        <button className="btn" onClick={gotoPrev} disabled={idx === 0}>← 上一題</button>
        <span className="dim mono" style={{ fontSize: 12 }}>
          {isAnswered ? "已作答" : "請選擇答案"}
        </span>
        <button className="btn btn-primary" onClick={gotoNext} disabled={!isAnswered}>
          {(idx + 1 >= queue.length && (!sr || isCorrect)) ? "完成測驗 →" : "下一題 →"}
        </button>
      </div>
    </Page>
  );
}

/* ============================================
   RESULT
   ============================================ */
function ResultPage({ go }) {
  const result = window.LAST_RESULT;
  if (!result) {
    return <Page label="05 Result">
      <Empty>沒有最近的作答紀錄。<br/><br/>
        <button className="btn" onClick={() => go("/")}>回到首頁</button>
      </Empty>
    </Page>;
  }

  const accuracy = Math.round(result.correctCount / result.total * 100);
  const grade =
    result.score >= 90 ? { label: "卓越", color: "var(--green)" } :
    result.score >= 75 ? { label: "良好", color: "var(--cyan)" } :
    result.score >= 60 ? { label: "及格", color: "var(--amber)" } :
                         { label: "需加強", color: "var(--red)" };

  return (
    <Page label="05 Result">
      <div className="mono" style={{ color: "var(--text-dim)", fontSize: 13, marginBottom: 16 }}>
        <span onClick={() => go("/")} style={{ cursor: "pointer" }}>~/home</span>
        <span> / </span>
        <span>quiz</span>
        <span> / </span>
        <span className="cyan">result</span>
      </div>

      <div className="result-hero">
        <div>
          <div className="mono dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>SCORE</div>
          <div className="score-big">
            {result.score}<span className="denom">/100</span>
          </div>
          <div className="mono" style={{ marginTop: 8, color: grade.color, fontWeight: 600 }}>● {grade.label}</div>
        </div>
        <div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginBottom: 18 }}>
            第 {result.chapter} 章　{result.chapterTitle}　·　{result.date}
          </div>
          <div className="result-stats">
            <div>
              <div className="result-stat-label">答對</div>
              <div className="result-stat-value green">{result.correctCount}<span className="dim" style={{ fontSize: 14 }}> 題</span></div>
            </div>
            <div>
              <div className="result-stat-label">答錯</div>
              <div className="result-stat-value red">{result.total - result.correctCount}<span className="dim" style={{ fontSize: 14 }}> 題</span></div>
            </div>
            <div>
              <div className="result-stat-label">用時</div>
              <div className="result-stat-value">{formatTime(result.timeSpent)}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
            <button className="btn btn-primary" onClick={() => go(`/quiz/${result.chapter}`)}>↻ 再來一次</button>
            <button className="btn" onClick={() => go("/review")}>錯題複習</button>
            <button className="btn btn-ghost" onClick={() => go("/leaderboard")}>查看排行榜</button>
            <button className="btn btn-ghost" onClick={() => go("/")}>回首頁</button>
          </div>
        </div>
      </div>

      <SectionHead
        title="detail / 每題對照"
        meta={
          result.spacedRepetition
            ? `共 ${result.total} 題 · 首次答對率 ${accuracy}% · 總嘗試 ${result.totalAttempts || result.total} 次`
            : `共 ${result.total} 題 · 正確率 ${accuracy}%`
        }
      />
      <div className="review-list">
        {result.details.map((d, i) => {
          const firstOk = d.firstTryCorrect !== undefined ? d.firstTryCorrect : (d.userAnswer === d.correctAnswer);
          const eventuallyOk = d.eventuallyCorrect !== undefined ? d.eventuallyCorrect : firstOk;
          const userOpt = d.options.find(o => o.key === d.userAnswer);
          const correctOpt = d.options.find(o => o.key === d.correctAnswer);
          return (
            <div className="review-row" key={d.id}>
              <div className={"review-marker " + (firstOk ? "ok" : "err")}>{firstOk ? "✓" : "✗"}</div>
              <div>
                <div className="review-q">
                  <span className="mono dim" style={{ marginRight: 8 }}>Q{String(i+1).padStart(2,"0")}.</span>
                  {d.stem}
                </div>
                <div className="review-answers">
                  <span>你的答案：</span>
                  <span className={firstOk ? "you-correct" : "you-wrong"}>
                    {d.userAnswer ? `(${d.userAnswer}) ${userOpt?.text || "—"}` : "未作答"}
                  </span>
                  {!firstOk && (
                    <>
                      <span>　|　正解：</span>
                      <span className="correct">({d.correctAnswer}) {correctOpt?.text}</span>
                      {result.spacedRepetition && eventuallyOk && d.attemptsCount > 1 && (
                        <span className="amber" style={{ marginLeft: 8 }}>　|　嘗試 {d.attemptsCount} 次後答對 ↻</span>
                      )}
                    </>
                  )}
                </div>
              </div>
              <span className={"tag " + (firstOk ? "tag-green" : (eventuallyOk ? "tag-amber" : "tag-red"))}>
                {firstOk ? "首次答對" : (eventuallyOk ? "重做答對" : "未答對")}
              </span>
            </div>
          );
        })}
      </div>
    </Page>
  );
}

/* ============================================
   HISTORY
   ============================================ */
function HistoryPage({ go }) {
  const history = lsGet(LS_KEYS.history, []).slice().reverse();
  const totalAttempts = history.length;
  const avgScore = history.length ? Math.round(history.reduce((s, h) => s + h.score, 0) / history.length) : 0;
  const bestScore = history.length ? Math.max(...history.map(h => h.score)) : 0;
  const totalTime = history.reduce((s, h) => s + h.timeSpent, 0);

  return (
    <Page label="06 History">
      <div style={{ padding: "12px 0 32px" }}>
        <div className="hero-prompt">$ cat ./history/*.log</div>
        <h1 className="hero-title" style={{ fontSize: 38 }}>歷史成績</h1>
        <p className="hero-sub">每次作答結果都儲存在本機 (localStorage) 中。</p>
      </div>

      <StatsStrip items={[
        { label: "嘗試次數", value: totalAttempts, unit: "次" },
        { label: "平均分數", value: avgScore, unit: "分" },
        { label: "最佳分數", value: bestScore, unit: "分" },
        { label: "總計用時", value: formatTime(totalTime) },
      ]}/>

      <SectionHead title="attempts / 作答紀錄"/>
      {totalAttempts === 0 ? (
        <Empty>
          目前尚無歷史紀錄。<br/>
          <span style={{ display: "inline-block", marginTop: 14 }}>
            <button className="btn" onClick={() => go("/chapter/6")}>開始第一次測驗 →</button>
          </span>
        </Empty>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>章節</th>
              <th>分數</th>
              <th>答對 / 總題</th>
              <th>用時</th>
              <th>日期</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {history.map((h, i) => (
              <tr key={i}>
                <td className="dim">{String(history.length - i).padStart(3, "0")}</td>
                <td>ch.{String(h.chapter).padStart(2,"0")} {h.chapterTitle}</td>
                <td>
                  <span style={{
                    color: h.score >= 90 ? "var(--green)" : h.score >= 60 ? "var(--text)" : "var(--red)",
                    fontWeight: 600,
                  }}>{h.score}</span>
                  <span className="dim"> / 100</span>
                </td>
                <td>{h.correctCount} / {h.total}</td>
                <td>{formatTime(h.timeSpent)}</td>
                <td className="dim">{h.date}</td>
                <td><button className="btn btn-sm btn-ghost" onClick={() => { window.LAST_RESULT = h; go("/result"); }}>檢視</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {totalAttempts > 0 && (
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => { if (confirm("清空所有歷史紀錄？")) { lsSet(LS_KEYS.history, []); window.location.hash = "/history"; window.location.reload(); } }}>
            ✕ 清空歷史紀錄
          </button>
        </div>
      )}
    </Page>
  );
}

/* ============================================
   LEADERBOARD
   ============================================ */
function LeaderboardPage({ go }) {
  // 結合 seed + 本機歷史
  const history = lsGet(LS_KEYS.history, []);
  const myEntries = history.map(h => ({
    name: "你",
    score: h.score,
    time: h.timeSpent,
    date: h.date.split(" ")[0] || h.date,
    isMe: true,
  }));
  const board = [...window.SEED_LEADERBOARD, ...myEntries]
    .sort((a, b) => b.score - a.score || a.time - b.time)
    .slice(0, 10);

  return (
    <Page label="07 Leaderboard">
      <div style={{ padding: "12px 0 32px" }}>
        <div className="hero-prompt">$ rank --top 10 --order score,time</div>
        <h1 className="hero-title" style={{ fontSize: 38 }}>排行榜</h1>
        <p className="hero-sub">第 6 章「堆疊與佇列」｜依分數降序，分數相同時用時較短者優先。</p>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th style={{ width: 60 }}>排名</th>
            <th>玩家</th>
            <th>分數</th>
            <th>用時</th>
            <th>日期</th>
          </tr>
        </thead>
        <tbody>
          {board.map((b, i) => {
            const medal = i === 0 ? "rank-1" : i === 1 ? "rank-2" : i === 2 ? "rank-3" : "";
            return (
              <tr key={i} style={b.isMe ? { background: "rgba(103,232,249,0.04)" } : {}}>
                <td>
                  {i < 3
                    ? <span className={"rank-medal " + medal}>{i+1}</span>
                    : <span className="dim">#{i+1}</span>
                  }
                </td>
                <td style={b.isMe ? { color: "var(--cyan)", fontWeight: 600 } : {}}>
                  {b.name}{b.isMe && <span className="tag tag-amber" style={{ marginLeft: 8 }}>YOU</span>}
                </td>
                <td>
                  <span style={{ fontWeight: 600 }}>{b.score}</span>
                  <span className="dim"> / 100</span>
                </td>
                <td>{formatTime(b.time)}</td>
                <td className="dim">{b.date}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {history.length === 0 && (
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <button className="btn btn-primary" onClick={() => go("/chapter/6")}>挑戰排行榜 →</button>
        </div>
      )}
    </Page>
  );
}

/* ============================================
   REVIEW (錯題)
   ============================================ */
function ReviewPage({ go }) {
  const history = lsGet(LS_KEYS.history, []);
  // 蒐集所有錯題 (去重，以最近一次紀錄為主)
  const wrongMap = new Map();
  history.forEach(h => {
    h.details.forEach(d => {
      if (d.userAnswer !== d.correctAnswer) {
        wrongMap.set(d.id, { ...d, chapter: h.chapter, chapterTitle: h.chapterTitle, date: h.date });
      } else {
        // 答對了就從錯題庫移除
        wrongMap.delete(d.id);
      }
    });
  });
  const wrongList = [...wrongMap.values()];

  return (
    <Page label="08 Review">
      <div style={{ padding: "12px 0 32px" }}>
        <div className="hero-prompt">$ grep -r "wrong" ./history/</div>
        <h1 className="hero-title" style={{ fontSize: 38 }}>錯題複習</h1>
        <p className="hero-sub">系統自動從歷史紀錄中蒐集你答錯的題目。答對後會自動從清單中移除。</p>
      </div>

      {wrongList.length === 0 ? (
        <Empty>
          ✓ 目前沒有錯題！<br/><br/>
          <button className="btn" onClick={() => go("/chapter/6")}>開始一次測驗 →</button>
        </Empty>
      ) : (
        <>
          <div className="notice" style={{ marginBottom: 16 }}>
            // 共 {wrongList.length} 題待複習
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {wrongList.map((d, i) => {
              const userOpt = d.options.find(o => o.key === d.userAnswer);
              const correctOpt = d.options.find(o => o.key === d.correctAnswer);
              return (
                <div key={d.id} className="qcard" style={{ padding: "24px 28px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <span className="mono dim" style={{ fontSize: 12 }}>
                      Q{String(i+1).padStart(2,"0")} · ch.{String(d.chapter).padStart(2,"0")} {d.chapterTitle}
                    </span>
                    <span className="tag tag-red">需複習</span>
                  </div>
                  <div style={{ fontSize: 16, marginBottom: 14, lineHeight: 1.6 }}>{d.stem}</div>
                  <div className="mono" style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.9 }}>
                    <div>你選的：<span className="red">({d.userAnswer || "—"}) {userOpt?.text || "未作答"}</span></div>
                    <div>正解：<span className="green">({d.correctAnswer}) {correctOpt?.text}</span></div>
                  </div>
                  {d.hint && (
                    <div style={{ marginTop: 14, padding: "12px 14px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, fontSize: 13, color: "var(--text-muted)" }}>
                      <span className="dim mono" style={{ fontSize: 11 }}># 解析　</span>{d.hint}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </Page>
  );
}

/* ============================================
   ADMIN
   ============================================ */
function emptyDraft() {
  return {
    id: "",
    stem: "",
    block: "",
    options: [
      { key: "A", text: "" },
      { key: "B", text: "" },
      { key: "C", text: "" },
      { key: "D", text: "" },
    ],
    answer: "A",
    hint: "",
    custom: true,
  };
}

function QuestionEditor({ initial, onSave, onCancel, mode, onDelete }) {
  const [draft, setDraft] = useStateP(() => JSON.parse(JSON.stringify(initial)));
  const [err, setErr] = useStateP("");

  function updateOption(idx, text) {
    const next = { ...draft, options: draft.options.map((o, i) => i === idx ? { ...o, text } : o) };
    setDraft(next);
  }
  function addOption() {
    if (draft.options.length >= 6) return;
    const letters = ["A","B","C","D","E","F"];
    const next = { ...draft, options: [...draft.options, { key: letters[draft.options.length], text: "" }] };
    setDraft(next);
  }
  function removeOption(idx) {
    if (draft.options.length <= 2) return;
    const filtered = draft.options.filter((_, i) => i !== idx);
    const letters = ["A","B","C","D","E","F"];
    const relettered = filtered.map((o, i) => ({ ...o, key: letters[i] }));
    let answer = draft.answer;
    if (!relettered.find(o => o.key === answer)) answer = relettered[0].key;
    setDraft({ ...draft, options: relettered, answer });
  }

  function handleSave() {
    if (!draft.stem.trim()) return setErr("題幹不可為空");
    const emptyOpt = draft.options.find(o => !o.text.trim());
    if (emptyOpt) return setErr(`選項 ${emptyOpt.key} 不可為空`);
    if (!draft.options.find(o => o.key === draft.answer)) return setErr("請選擇正確答案");
    onSave({ ...draft, stem: draft.stem.trim(), hint: draft.hint.trim(), block: draft.block.trim() });
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, maxHeight: "90vh", overflowY: "auto" }}>
        <div className="panel-header" style={{ position: "sticky", top: 0, zIndex: 2 }}>
          <span className="mono">{mode === "edit" ? `edit_question / ${draft.id}` : "new_question / 新增題目"}</span>
          <span className="dim mono" style={{ cursor: "pointer" }} onClick={onCancel}>✕</span>
        </div>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <div className="mono dim" style={{ fontSize: 11, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>題幹 *</div>
            <textarea
              className="input"
              value={draft.stem}
              onChange={e => setDraft({ ...draft, stem: e.target.value })}
              rows={3}
              placeholder="例如：下列何者是「後進先出」(LIFO) 的資料結構？"
              style={{ fontFamily: "var(--font-sans)", resize: "vertical" }}
            />
          </div>

          <div>
            <div className="mono dim" style={{ fontSize: 11, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>附加程式碼 / 算式 (選填)</div>
            <textarea
              className="input"
              value={draft.block}
              onChange={e => setDraft({ ...draft, block: e.target.value })}
              rows={2}
              placeholder="例如：Push(1)、Push(2)、Pop()、Push(3)"
              style={{ resize: "vertical" }}
            />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span className="mono dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>選項 *　<span style={{ textTransform: "none", letterSpacing: 0 }}>(右側勾選正解)</span></span>
              <button className="btn btn-sm btn-ghost" onClick={addOption} disabled={draft.options.length >= 6}>+ 加選項</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {draft.options.map((o, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="mono" style={{
                    width: 28, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                    background: "var(--bg-elev-2)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
                    color: o.key === draft.answer ? "var(--green)" : "var(--text-dim)",
                    fontWeight: 600,
                    flexShrink: 0,
                  }}>{o.key}</span>
                  <input
                    className="input"
                    value={o.text}
                    onChange={e => updateOption(i, e.target.value)}
                    placeholder={`選項 ${o.key} 內容`}
                    style={{ fontFamily: "var(--font-sans)" }}
                  />
                  <label style={{
                    display: "flex", alignItems: "center", gap: 4, fontSize: 12,
                    color: o.key === draft.answer ? "var(--green)" : "var(--text-dim)",
                    fontFamily: "var(--font-mono)", cursor: "pointer", flexShrink: 0,
                  }}>
                    <input
                      type="radio"
                      name={`ans-${draft.id || "new"}`}
                      checked={o.key === draft.answer}
                      onChange={() => setDraft({ ...draft, answer: o.key })}
                      style={{ accentColor: "var(--green)" }}
                    />
                    正解
                  </label>
                  {draft.options.length > 2 && (
                    <button className="btn btn-sm btn-ghost" onClick={() => removeOption(i)} style={{ padding: "6px 10px" }} title="刪除選項">✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mono dim" style={{ fontSize: 11, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>解析 / 提示 (選填)</div>
            <textarea
              className="input"
              value={draft.hint}
              onChange={e => setDraft({ ...draft, hint: e.target.value })}
              rows={2}
              placeholder="作答後顯示的解釋，幫助使用者理解正解的原因"
              style={{ fontFamily: "var(--font-sans)", resize: "vertical" }}
            />
          </div>

          {err && (
            <div style={{
              padding: "10px 14px", border: "1px solid var(--red-border)", background: "var(--red-bg)",
              color: "var(--red)", borderRadius: "var(--radius)", fontFamily: "var(--font-mono)", fontSize: 12,
            }}>! {err}</div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 4 }}>
            <div>
              {mode === "edit" && initial.custom && (
                <button className="btn btn-ghost btn-sm" onClick={onDelete} style={{ color: "var(--red)", borderColor: "var(--red-border)" }}>
                  🗑 刪除此題
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-ghost" onClick={onCancel}>取消</button>
              <button className="btn btn-primary" onClick={handleSave}>儲存</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminPage({ go }) {
  const [search, setSearch] = useStateP("");
  const [editing, setEditing] = useStateP(null); // { mode, data }
  const [refresh, setRefresh] = useStateP(0);

  const allQuestions = useMemoP(() => getAllQuestions(), [refresh]);
  const customCount = useMemoP(() => getCustomQuestions().length, [refresh]);
  const list = allQuestions.filter(q =>
    !search || q.stem.includes(search) || q.id.includes(search)
  );

  function handleAdd() {
    const id = "C-" + Date.now().toString(36).slice(-5).toUpperCase();
    setEditing({ mode: "new", data: { ...emptyDraft(), id } });
  }

  function handleSave(draft) {
    const customs = getCustomQuestions();
    if (editing.mode === "new") {
      setCustomQuestions([...customs, draft]);
    } else {
      // 只允許編輯使用者新增的題目；built-in 題目改成 read-only
      if (draft.custom) {
        const idx = customs.findIndex(q => q.id === draft.id);
        if (idx >= 0) {
          const next = [...customs];
          next[idx] = draft;
          setCustomQuestions(next);
        }
      }
    }
    setEditing(null);
    setRefresh(r => r + 1);
  }

  function handleDelete() {
    if (!confirm(`確定刪除題目 ${editing.data.id}？此操作無法復原。`)) return;
    const customs = getCustomQuestions().filter(q => q.id !== editing.data.id);
    setCustomQuestions(customs);
    setEditing(null);
    setRefresh(r => r + 1);
  }

  return (
    <Page label="09 Admin">
      <div style={{ padding: "12px 0 24px" }}>
        <div className="hero-prompt">$ python manage.py runserver  ─  /admin/</div>
        <h1 className="hero-title" style={{ fontSize: 38 }}>題庫管理</h1>
        <p className="hero-sub">管理者可在此新增 / 修改 / 刪除題目。新增的題目會自動加入測驗題庫。</p>
      </div>

      <StatsStrip items={[
        { label: "題庫總數", value: allQuestions.length, unit: "題" },
        { label: "課程題庫", value: window.QUESTIONS_CH6.length, unit: "題" },
        { label: "自訂新增", value: customCount, unit: "題" },
        { label: "章節",     value: "ch.06" },
      ]}/>

      <div className="section-head" style={{ marginTop: 40, marginBottom: 16 }}>
        <h3 className="section-title">Question_set / 題目列表</h3>
        <div className="admin-toolbar" style={{ margin: 0 }}>
          <input className="input admin-search" placeholder="搜尋題目..." value={search} onChange={e => setSearch(e.target.value)}/>
          <button className="btn btn-primary btn-sm" onClick={handleAdd}>+ 新增題目</button>
        </div>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th style={{ width: "50%" }}>題幹</th>
            <th>選項</th>
            <th>正解</th>
            <th>來源</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {list.map(q => {
            const isUserCustom = q.id.startsWith("C-");
            return (
              <tr key={q.id}>
                <td className="dim">{q.id}</td>
                <td style={{ fontFamily: "var(--font-sans)", whiteSpace: "normal", maxWidth: 0 }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.stem}</div>
                </td>
                <td>{q.options.length}</td>
                <td><span className="tag tag-green">{q.answer}</span></td>
                <td className="dim">
                  {isUserCustom ? <span className="tag tag-amber">新增</span>
                   : q.custom ? <span className="tag tag-amber">本組設計</span>
                   : "課程題庫"}
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => setEditing({ mode: "edit", data: q })}
                  >
                    {isUserCustom ? "編輯" : "檢視"}
                  </button>
                </td>
              </tr>
            );
          })}
          {list.length === 0 && (
            <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--text-dim)" }}>沒有符合條件的題目</td></tr>
          )}
        </tbody>
      </table>

      <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div className="notice">
          // 提示：課程題庫題目僅可檢視，自訂題目可編輯 / 刪除。
        </div>
        {customCount > 0 && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              if (confirm(`確定清空全部 ${customCount} 題自訂題目？此操作無法復原。`)) {
                setCustomQuestions([]);
                setRefresh(r => r + 1);
              }
            }}
            style={{ color: "var(--red)" }}
          >
            ✕ 清空自訂題庫
          </button>
        )}
      </div>

      {editing && (
        <QuestionEditor
          initial={editing.data}
          mode={editing.mode}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
          onDelete={handleDelete}
        />
      )}
    </Page>
  );
}

Object.assign(window, {
  HomePage, ChaptersPage, ChapterIntroPage, QuizPage, ResultPage,
  HistoryPage, LeaderboardPage, ReviewPage, AdminPage,
});
