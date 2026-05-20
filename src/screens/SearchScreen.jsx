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

// Approximate height of the pinned SEARCH button for bottom padding calculation
const SEARCH_BTN_HEIGHT = 58;

export default function SearchScreen({ onSearch, loading, error, commanderCard, onCommanderCardChange }) {
  const [brewInput,    setBrewInput]    = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [draftInput,   setDraftInput]   = useState("");
  // rawMode — NLP translation deferred; kept for placeholder + handleSearch parity
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
    <>
      <div style={{
        minHeight: "100dvh",
        background: "var(--bg)",
        color: "var(--text)",
        fontFamily: "'Space Grotesk', sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingBottom: `calc(${NAV_HEIGHT}px + ${SEARCH_BTN_HEIGHT}px + env(safe-area-inset-bottom) + 16px)`,
      }}>
        <div style={{
          width: "100%",
          maxWidth: 430,
          padding: "0 20px",
          display: "flex",
          flexDirection: "column",
          flex: 1,
        }}>

          {/* ── Title ── */}
          <div style={{ padding: "48px 0 16px" }}>
            <div style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 48, lineHeight: 1,
              letterSpacing: "0.04em",
              color: "var(--text)",
            }}>
              DECK STACK
            </div>
          </div>

          {/* ── Subtitle ── */}
          <div style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            color: "var(--muted)",
            marginBottom: 28,
            lineHeight: 1.5,
          }}>
            Search. Swipe. Brew. Deck Stack uses Scryfall syntax to stack and swipe cards for your commander pile.
          </div>

          {/* ── Search label ── */}
          <div style={{
            fontSize: 10, letterSpacing: "0.15em",
            color: "var(--muted)", marginBottom: 8,
          }}>
            SEARCH YOUR STACK
          </div>

          {/* ── Input ── */}
          <div style={{ marginBottom: 8 }}>
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

          {/* ── Win98 progress bar — visible while Scryfall is loading ── */}
          <Win98ProgressBar active={loading} />

          {/* ── Hint ── */}
          <div style={{
            textAlign: "center",
            fontSize: 12, color: "var(--muted)",
            marginBottom: 20,
          }}>
            ← swipe left to yeet &nbsp;·&nbsp; swipe right to keep →
          </div>

          {/* ── Footer ── */}
          <div style={{
            marginTop: "auto",
            display: "flex", justifyContent: "center", gap: 20,
            paddingBottom: 28,
          }}>
            <a
              href="https://bsky.app/profile/commanderzen.bsky.social"
              target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, color: "var(--muted)", textDecoration: "none" }}
              onMouseOver={e => e.currentTarget.style.color = "var(--text)"}
              onMouseOut={e => e.currentTarget.style.color = "var(--muted)"}
            >
              reach out @commanderzen
            </a>
            <a
              href="https://github.com/commander-zen/deck-stack/issues/new?labels=bug&template=bug_report.md"
              target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, color: "var(--muted)", textDecoration: "none" }}
              onMouseOver={e => e.currentTarget.style.color = "var(--text)"}
              onMouseOut={e => e.currentTarget.style.color = "var(--muted)"}
            >
              Report a Bug
            </a>
          </div>

        </div>
      </div>

      {/* ── SEARCH button — pinned above nav bar ── */}
      <div style={{
        position: "fixed",
        bottom: `calc(${NAV_HEIGHT}px + env(safe-area-inset-bottom))`,
        left: 0, right: 0,
        maxWidth: 430,
        margin: "0 auto",
        padding: "0 20px",
        zIndex: 50,
      }}>
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
      </div>
    </>
  );
}
