/* 根元件 + 路由 + Tweaks panel */

const { useState: useStateA, useEffect: useEffectA } = React;

/* Hash 路由：#/path/:id */
function useHashRoute() {
  const [hash, setHash] = useStateA(window.location.hash || "#/");
  useEffectA(() => {
    const handler = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  const path = hash.replace(/^#/, "") || "/";
  const segments = path.split("/").filter(Boolean);
  return { path, segments };
}

function go(path) {
  window.location.hash = path;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function App() {
  const route = useHashRoute();
  const { segments } = route;

  let view;
  if (segments.length === 0) view = <HomePage go={go}/>;
  else if (segments[0] === "chapters") view = <ChaptersPage go={go}/>;
  else if (segments[0] === "chapter" && segments[1]) view = <ChapterIntroPage go={go} chapterId={segments[1]}/>;
  else if (segments[0] === "quiz" && segments[1]) view = <QuizPage key={`quiz-${segments[1]}-${Date.now()}`} go={go} chapterId={segments[1]}/>;
  else if (segments[0] === "result") view = <ResultPage go={go}/>;
  else if (segments[0] === "history") view = <HistoryPage go={go}/>;
  else if (segments[0] === "leaderboard") view = <LeaderboardPage go={go}/>;
  else if (segments[0] === "review") view = <ReviewPage go={go}/>;
  else if (segments[0] === "admin") view = <AdminPage go={go}/>;
  else view = <HomePage go={go}/>;

  return (
    <div className="app">
      <Header route={route} go={go}/>
      <main>{view}</main>
      <Footer/>
    </div>
  );
}

function Footer() {
  return (
    <footer style={{
      borderTop: "1px solid var(--border)",
      padding: "20px 32px",
      marginTop: "auto",
      background: "var(--bg-elev)",
    }}>
      <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 0, flexWrap: "wrap", gap: 12 }}>
        <div className="mono dim" style={{ fontSize: 12 }}>
          資料結構期末專題 · 資管二甲 · CBF113015 / CBF113017 / CBF113020
        </div>
        <div className="mono dim" style={{ fontSize: 12 }}>
          Django · Python 3 · MTV Architecture
        </div>
      </div>
    </footer>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);
