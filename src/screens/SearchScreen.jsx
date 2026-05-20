import { useState, useEffect, useRef } from "react";
import { NAV_HEIGHT } from "../components/BottomNav.jsx";
import { getSettings } from "../lib/settings.js";

const HISTORY_KEY = "ds_search_history";
function readHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]"); }
  catch { return []; }
}
function saveToHistory(query) {
  const prev = readHistory();
  const next = [query, ...prev.filter(q => q !== query)].slice(0, 10);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

// Win98-style chunky segmented progress bar
const PROGRESS_SEGMENTS = 10;
function Win98ProgressBar({ active }) {
  const [pos, setPos] = useState(0);

  useEffect(() => {
    if (!active) { setPos(0); return; }
    const id = setInterval(() => setPos(p => (p + 1) % (PROGRESS_SEGMENTS + 1)), 150);
    return () => clearInterval(id);
  }, [active]);

  if (!active) return null;

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{
        borderStyle: "solid",
        borderWidth: "2px",
        borderTopColor: "var(--bevel-dark)",
        borderLeftColor: "var(--bevel-dark)",
        borderBottomColor: "var(--bevel-light)",
        borderRightColor: "var(--bevel-light)",
        background: "var(--color-bg)",
        padding: 3,
      }}>
        <div style={{ display: "flex", gap: 2 }}>
          {Array.from({ length: PROGRESS_SEGMENTS }, (_, i) => (
            <div key={i} style={{
              flex: 1,
              height: 14,
              background: i < pos ? "var(--color-titlebar)" : "transparent",
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SearchScreen({ onSearch, loading, error, commanderCard, onCommanderCardChange }) {
  const [brewInput,    setBrewInput]    = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [draftInput,   setDraftInput]   = useState("");
  const [rawMode] = useState(() => getSettings().rawQueryMode);

  const isDisabled = loading;

  function handleSearch() {
    const input = brewInput.trim();
    if (!input || isDisabled) return;
    saveToHistory(input);
    setHistoryIndex(-1);
    setDraftInput("");
    setBrewInput("");
    onSearch(input);
  }

  function handleBrewKeyDown(e) {
    if (e.key === "Enter") { handleSearch(); return; }
    const history = readHistory();
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      if (historyIndex === -1) {
        setDraftInput(brewInput); setHistoryIndex(0); setBrewInput(history[0]);
      } else {
        const next = Math.min(historyIndex + 1, history.length - 1);
        setHistoryIndex(next); setBrewInput(history[next]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex <= 0) { setHistoryIndex(-1); setBrewInput(draftInput); }
      else { const next = historyIndex - 1; setHistoryIndex(next); setBrewInput(history[next]); }
    } else {
      if (historyIndex !== -1) setHistoryIndex(-1);
    }
  }

  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--bg)",
      color: "var(--text)",
      fontFamily: "'Space Grotesk', sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      paddingBottom: `calc(${NAV_HEIGHT}px + env(safe-area-inset-bottom))`,
      overflowY: "auto",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 430,
        padding: "0 20px",
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: `calc(100dvh - ${NAV_HEIGHT}px - env(safe-area-inset-bottom))`,
      }}>

        {/* ── Title ── */}
        <div style={{ padding: "48px 0 12px" }}>
          <div style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 48, lineHeight: 1,
            letterSpacing: "0.04em",
            color: "var(--text)",
          }}>
            DECK STACK
          </div>
        </div>

        {/* ── Tagline ── */}
        <div style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 20,
          fontWeight: 600,
          color: "var(--text)",
          marginBottom: 10,
          lineHeight: 1.3,
        }}>
          Search. Swipe. Brew.
        </div>

        {/* ── Description ── */}
        <div style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 13,
          color: "var(--muted)",
          marginBottom: 0,
          lineHeight: 1.5,
        }}>
          Deck Stack uses Scryfall syntax to stack and swipe cards for your commander pile.
        </div>

        {/* ── Spacer ── */}
        <div style={{ flex: 1 }} />

        {/* ── Input ── */}
        <div style={{ marginBottom: 0 }}>
          <input
            type="text"
            value={brewInput}
            onChange={e => { if (!isDisabled) setBrewInput(e.target.value); }}
            onKeyDown={handleBrewKeyDown}
            onFocus={() => { setHistoryIndex(-1); setDraftInput(""); }}
            placeholder={rawMode ? "f:commander c:g cmc<=3 otag:ramp" : "What are you looking for?"}
            autoComplete="off" autoCorrect="off" spellCheck={false}
            readOnly={isDisabled}
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "var(--color-bg)",
              color: "var(--color-text-primary)",
              fontFamily: "var(--font-system)",
              fontSize: 16,
              borderStyle: "solid",
              borderWidth: "2px",
              borderTopColor: "var(--bevel-dark)",
              borderLeftColor: "var(--bevel-dark)",
              borderBottomColor: "var(--bevel-light)",
              borderRightColor: "var(--bevel-light)",
              padding: "var(--space-1) var(--space-2)",
              borderRadius: 0,
              outline: "none",
              opacity: isDisabled ? 0.5 : 1,
            }}
          />
        </div>

        {/* ── Win98 progress bar ── */}
        <Win98ProgressBar active={loading} />

        {/* ── SEARCH button ── */}
        <button
          onClick={handleSearch}
          disabled={isDisabled || !brewInput.trim()}
          style={{
            width: "100%",
            background: "var(--color-titlebar)",
            color: "var(--color-titlebar-text)",
            fontFamily: "var(--font-system)",
            fontSize: "var(--font-size-sm)",
            borderStyle: "solid",
            borderWidth: "2px",
            borderTopColor: "#ffffff",
            borderLeftColor: "#ffffff",
            borderBottomColor: "#000040",
            borderRightColor: "#000040",
            padding: "18px 24px",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: (isDisabled || !brewInput.trim()) ? "default" : "pointer",
            borderRadius: 0,
            opacity: (isDisabled || !brewInput.trim()) ? 0.5 : 1,
            marginTop: 0,
          }}
        >
          <span style={{
            fontFamily: "var(--font-system)",
            fontSize: "var(--font-size-xl)",
            letterSpacing: "0.12em",
            color: "var(--color-titlebar-text)",
          }}>
            SEARCH
          </span>
        </button>

        {/* ── Swipe hint ── */}
        <div style={{
          textAlign: "center",
          fontSize: 12, color: "var(--muted)",
          marginTop: 10,
          marginBottom: 8,
        }}>
          ← swipe left to yeet &nbsp;·&nbsp; swipe right to keep →
        </div>

        {/* ── Easter egg footer — sits just below the fold ── */}
        <div style={{
          display: "flex", justifyContent: "center", gap: 20,
          paddingBottom: 28,
          paddingTop: 12,
        }}>
          <a
            href="https://bsky.app/profile/commanderzen.bsky.social"
            target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", textDecoration: "none" }}
          >
            reach out @commanderzen
          </a>
          <a
            href="https://github.com/commander-zen/deck-stack/issues/new?labels=bug&template=bug_report.md"
            target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", textDecoration: "none" }}
          >
            Report a Bug
          </a>
        </div>

      </div>
    </div>
  );
}
