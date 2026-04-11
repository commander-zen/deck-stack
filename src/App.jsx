import { useState } from "react";
import { fetchAllCards } from "./lib/scryfall.js";
import SearchScreen    from "./pages/SearchScreen.jsx";
import CommanderScreen from "./pages/CommanderScreen.jsx";
import SwipeScreen     from "./pages/SwipeScreen.jsx";
import PileScreen      from "./pages/PileScreen.jsx";

const LOAD_MORE_CAP = 500;

function readMode() {
  try { return localStorage.getItem("deckswipe_mode") ?? "manual"; }
  catch { return "manual"; }
}
function writeMode(m) {
  try { localStorage.setItem("deckswipe_mode", m); } catch {}
}

// ── Mode toggle bar ───────────────────────────────────────────────────────────

function ModeToggle({ easyMode, onToggle }) {
  return (
    <div style={{
      width: "100%",
      background: "var(--bg)",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
      display: "flex",
      justifyContent: "center",
      padding: "10px 20px",
      position: "relative",
      zIndex: 200,
      flexShrink: 0,
    }}>
      <div style={{
        display: "flex",
        background: "var(--panel)",
        borderRadius: 10,
        padding: 3,
        gap: 2,
      }}>
        <button
          onClick={() => onToggle("easy")}
          style={{
            padding: "6px 20px",
            borderRadius: 8,
            border: "none",
            background: easyMode ? "var(--primary)" : "transparent",
            color: easyMode ? "#fff" : "var(--muted)",
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 13,
            letterSpacing: 3,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          EASY MODE
        </button>
        <button
          onClick={() => onToggle("manual")}
          style={{
            padding: "6px 20px",
            borderRadius: 8,
            border: "none",
            background: !easyMode ? "rgba(255,255,255,0.08)" : "transparent",
            color: !easyMode ? "var(--text)" : "var(--muted)",
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 13,
            letterSpacing: 3,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          MANUAL
        </button>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [easyMode,      setEasyMode]      = useState(() => readMode() === "easy");
  const [screen,        setScreen]        = useState(() => readMode() === "easy" ? "commander" : "search");
  const [cards,         setCards]         = useState([]);
  const [pile,          setPile]          = useState([]);
  const [currentQuery,  setCurrentQuery]  = useState("");
  const [commander,     setCommander]     = useState(null);
  const [vegCategories, setVegCategories] = useState(null);

  // ── Mode toggle ───────────────────────────────────────────────────────────

  function handleToggleMode(mode) {
    const isEasy = mode === "easy";
    setEasyMode(isEasy);
    writeMode(mode);
    if (screen === "search" || screen === "commander") {
      setScreen(isEasy ? "commander" : "search");
    }
  }

  // ── Manual flow handlers ──────────────────────────────────────────────────

  function handleCardsReady(cardList, query) {
    setCards(cardList);
    setCurrentQuery(query);
    setCommander(null);
    setVegCategories(null);
    setPile([]);
    setScreen("swipe");
  }

  // ── Easy mode handlers ────────────────────────────────────────────────────

  function handleCommanderReady(cmdr, cardPool) {
    const cats = [...new Set(cardPool.map(c => c._vegCategory).filter(Boolean))];
    setCommander(cmdr);
    setVegCategories(cats);
    setCards(cardPool);
    setCurrentQuery("");
    setPile([]);
    setScreen("swipe");
  }

  // ── Shared handlers ───────────────────────────────────────────────────────

  function handleSwipeDone(keptCards) {
    setPile(keptCards);
    setScreen("pile");
  }

  function handleNewSearch() {
    setCards([]);
    setPile([]);
    setCurrentQuery("");
    setCommander(null);
    setVegCategories(null);
    setScreen(easyMode ? "commander" : "search");
  }

  async function handleLoadMore(callback) {
    if (!currentQuery) return;
    const ctrl      = new AbortController();
    const collected = [];
    try {
      await fetchAllCards(
        currentQuery,
        ({ partial, finished }) => {
          if (partial) {
            collected.length = 0;
            collected.push(...partial);
          }
          if (!finished && collected.length >= cards.length + LOAD_MORE_CAP) {
            ctrl.abort();
          }
        },
        { signal: ctrl.signal },
      );
    } catch (err) {
      if (err.name !== "AbortError") return;
    }
    const moreCards = collected.slice(cards.length, cards.length + LOAD_MORE_CAP);
    if (moreCards.length > 0) callback(moreCards);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const onLanding = screen === "search" || screen === "commander";

  if (screen === "swipe") {
    return (
      <SwipeScreen
        initialCards={cards}
        onDone={handleSwipeDone}
        onBack={handleNewSearch}
        onLoadMore={currentQuery ? handleLoadMore : undefined}
        commander={commander}
        vegCategories={vegCategories}
      />
    );
  }

  if (screen === "pile") {
    return <PileScreen pile={pile} onNewSearch={handleNewSearch} />;
  }

  // Landing screens: wrap with mode toggle
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <ModeToggle easyMode={easyMode} onToggle={handleToggleMode} />
      {screen === "commander"
        ? <CommanderScreen onCommanderReady={handleCommanderReady} />
        : <SearchScreen    onCardsReady={handleCardsReady} />
      }
    </div>
  );
}
