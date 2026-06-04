/* 共用 UI 元件 — Terminal frame, Hero, Buttons, Stats, etc */

const { useState, useEffect, useRef, useMemo } = React;

/* ============ Header / Nav ============ */
function Header({ route, go }) {
  const links = [
    { id: "home", label: "~/home", path: "/" },
    { id: "chapters", label: "chapters", path: "/chapters" },
    { id: "leaderboard", label: "leaderboard", path: "/leaderboard" },
    { id: "history", label: "history", path: "/history" },
    { id: "review", label: "review", path: "/review" },
    { id: "admin", label: "admin", path: "/admin" },
  ];
  const active = route.path === "/" ? "home"
    : route.path.startsWith("/chapter") || route.path.startsWith("/quiz") ? "chapters"
    : links.find(l => route.path.startsWith(l.path) && l.path !== "/")?.id || "";

  return (
    <header className="header">
      <div className="header-inner">
        <div className="brand" onClick={() => go("/")}>
          <span className="brand-dot"></span>
          <span className="brand-name">資料結構</span>
          <span className="brand-slash">/</span>
          <span className="brand-path">Final&nbsp;project</span>
        </div>
        <nav className="nav">
          {links.map(l => (
            <span
              key={l.id}
              className={"nav-link" + (active === l.id ? " active" : "")}
              onClick={() => go(l.path)}
            >
              {l.label}
            </span>
          ))}
        </nav>
        <div className="header-meta">
          <span>● 已連線</span>
          <span className="dim">v1.0.0</span>
        </div>
      </div>
    </header>
  );
}

/* ============ Page wrapper ============ */
function Page({ label, children }) {
  return (
    <div className="container" data-screen-label={label}>
      {children}
    </div>
  );
}

/* ============ Section header ============ */
function SectionHead({ title, meta }) {
  return (
    <div className="section-head">
      <h3 className="section-title">{title}</h3>
      {meta && <span className="section-meta">{meta}</span>}
    </div>
  );
}

/* ============ Stats strip ============ */
function StatsStrip({ items }) {
  return (
    <div className="stats">
      {items.map((s, i) => (
        <div className="stat" key={i}>
          <div className="stat-label">{s.label}</div>
          <div className="stat-value">
            {s.value}{s.unit && <span className="unit">{s.unit}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============ Window-chrome panel ============ */
function TerminalPanel({ title, children, right }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="win-dots">
            <span className="win-dot"></span>
            <span className="win-dot"></span>
            <span className="win-dot"></span>
          </span>
          <span>{title}</span>
        </div>
        {right}
      </div>
      <div className="panel-body">{children}</div>
    </div>
  );
}

/* ============ Empty state ============ */
function Empty({ children }) {
  return <div className="empty">{children}</div>;
}

/* ============ Random helpers ============ */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ============ Format seconds → mm:ss ============ */
function formatTime(sec) {
  if (sec == null || isNaN(sec)) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ============ localStorage helpers ============ */
const LS_KEYS = {
  history: "ds_quiz_history",
  leaderboard: "ds_quiz_leaderboard",
  bank: "ds_quiz_bank_v1",
  customQuestions: "ds_quiz_custom_questions_v1",
};

function lsGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

/* ============ 題庫存取（built-in + 使用者新增） ============ */
function getCustomQuestions() {
  return lsGet(LS_KEYS.customQuestions, []);
}
function setCustomQuestions(arr) {
  lsSet(LS_KEYS.customQuestions, arr);
}
function getAllQuestions() {
  return [...window.QUESTIONS_CH6, ...getCustomQuestions()];
}

/* ============ Export to window ============ */
Object.assign(window, {
  Header, Page, SectionHead, StatsStrip, TerminalPanel, Empty,
  shuffle, formatTime, lsGet, lsSet, LS_KEYS,
  getCustomQuestions, setCustomQuestions, getAllQuestions,
});
