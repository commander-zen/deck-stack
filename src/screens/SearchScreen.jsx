import { useState, useEffect, useRef } from "react";
import { NAV_HEIGHT } from "../components/BottomNav.jsx";
import { searchCommanders, getCardImage } from "../lib/scryfall.js";
import { translateToScryfall } from "../lib/nlp.js";
import { getSettings, updateSetting } from "../lib/settings.js";

// Tracks first search of the JS session — resets on page reload only
let hasSearchedThisSession = false;

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

const COLOR_DOT = { W: "#e8d5a0", U: "#2060c0", B: "#555", R: "#cc2200", G: "#1a7035" };
function ColorPip({ color }) {
  return (
    <div style={{
      width: 14, height: 14, borderRadius: "50%",
      background: COLOR_DOT[color] ?? "#888",
      border: "1px solid rgba(255,255,255,0.2)",
      flexShrink: 0,
    }} />
  );
}

// ── Animation ─────────────────────────────────────────────────────────────────

const ANIM_CSS = `
@keyframes ds-box-slide {
  0%   { opacity: 0; transform: translateY(80px) scale(0.9); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes ds-card-fan {
  0%   { opacity: 0; transform: rotate(0deg) translateY(0px); }
  20%  { opacity: 1; }
  55%  { transform: rotate(var(--fr)) translateY(var(--fy)); opacity: 1; }
  80%  { transform: rotate(var(--fr)) translateY(var(--fy)); opacity: 0.5; }
  100% { transform: rotate(0deg) translateY(0px); opacity: 0; }
}
@keyframes ds-spinner {
  to { transform: rotate(360deg); }
}
`;

const FAN_CARDS = Array.from({ length: 22 }, (_, i) => {
  const t = i / 21;
  const fr = -50 + t * 100;
  const fy = -40 - Math.abs(fr) * 0.15;
  return { fr, fy };
});

function CardFan({ animPhase }) {
  const duration = animPhase === "full" ? 1400 : 400;
  const startDelay = animPhase === "full" ? 600 : 0;
  return (
    <>
      {FAN_CARDS.map(({ fr, fy }, i) => (
        <div key={i} style={{
          position: "absolute",
          top: "50%", left: "50%",
          width: 28, height: 40,
          marginLeft: -14, marginTop: -20,
          borderRadius: 4,
          background: "linear-gradient(135deg, var(--panel2), var(--panel))",
          border: "1px solid rgba(91,143,255,0.35)",
          transformOrigin: "50% 100%",
          "--fr": `${fr}deg`,
          "--fy": `${fy}px`,
          animation: `ds-card-fan ${duration}ms ease-in-out ${startDelay + i * 15}ms both`,
        }} />
      ))}
    </>
  );
}

function LoadingOverlay({ phase }) {
  const animPhase = phase === "animating-full" ? "full" : "short";
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "var(--bg)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ position: "relative", width: 100, height: 140 }}>
        {animPhase === "full" && (
          <div style={{
            position: "absolute", inset: 0,
            borderRadius: 8,
            background: "var(--panel)",
            border: "1.5px solid rgba(91,143,255,0.3)",
            boxShadow: "0 0 40px rgba(91,143,255,0.12)",
            animation: "ds-box-slide 600ms cubic-bezier(0.22,1,0.36,1) forwards",
          }} />
        )}
        <CardFan animPhase={animPhase} />
      </div>
    </div>
  );
}

// JEEVES_BLURB — rotating tip copy. Replace this array to update all tips.
const TIPS = [
  "Swipe right to keep a card, left to pass. Arrow keys work too.",
  "Try searching 'aggressive ramp package' or 'cheap board wipes under 3 mana'.",
  "Set a commander first and searches will automatically filter by color identity.",
  "WREC score tracks deck balance: ramp, draw, interaction, mana base, and win conditions.",
  "Unsure about a card? Swipe up to send it to the Maybeboard instead.",
  "Tap any card in the Pile to inspect it. Long-press to crown it as commander.",
  "Import a Moxfield URL or paste a decklist using the Import button on the search screen.",
  "In green or black decks, searching 'counters' finds +1/+1 synergies, not counterspells.",
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function SearchScreen({ onSearch, loading, error, commanderCard, onCommanderCardChange }) {
  const [cmdQuery,     setCmdQuery]     = useState("");
  const [cmdResults,   setCmdResults]   = useState([]);
  const [cmdOpen,      setCmdOpen]      = useState(false);
  const [cmdFocused,   setCmdFocused]   = useState(false);
  const [cmdExpanded,  setCmdExpanded]  = useState(false);
  const [brewInput,    setBrewInput]    = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [draftInput,   setDraftInput]   = useState("");
  const [rawMode,      setRawMode]      = useState(() => getSettings().rawQueryMode);
  // localLoading: false | "translating" | "animating-full" | "animating-short"
  const [localLoading, setLocalLoading] = useState(false);
  const [tipIndex,     setTipIndex]     = useState(0); // JEEVES_BLURB

  const abortRef    = useRef(null);
  const cmdInputRef = useRef(null);

  const isDisabled = loading || !!localLoading;
  const placeholder = rawMode
    ? "f:commander c:g cmc<=3 otag:ramp"
    : "what are you looking for?";

  // Auto-focus commander input when panel opens
  useEffect(() => {
    if (cmdExpanded) setTimeout(() => cmdInputRef.current?.focus(), 50);
  }, [cmdExpanded]);

  // Commander autocomplete
  useEffect(() => {
    if (!cmdQuery.trim()) { setCmdResults([]); setCmdOpen(false); return; }
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const results = await searchCommanders(cmdQuery, { signal: ctrl.signal });
      if (!ctrl.signal.aborted) {
        setCmdResults(results.slice(0, 5));
        setCmdOpen(results.length > 0);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [cmdQuery]);

  function selectCommander(card) {
    onCommanderCardChange(card);
    setCmdQuery(""); setCmdResults([]); setCmdOpen(false); setCmdExpanded(false);
  }

  function handlePillClick() {
    if (commanderCard) { onCommanderCardChange(null); setCmdExpanded(true); }
    else setCmdExpanded(e => !e);
  }

  function toggleRawMode() {
    const next = !rawMode;
    setRawMode(next);
    updateSetting("rawQueryMode", next);
  }

  async function handleSearch() {
    const input = brewInput.trim();
    if (!input || isDisabled) return;

    setTipIndex(i => (i + 1) % TIPS.length); // JEEVES_BLURB
    saveToHistory(input);
    setHistoryIndex(-1);
    setDraftInput("");
    setBrewInput("");

    let query;
    if (rawMode) {
      query = input;
    } else {
      setLocalLoading("translating");
      try {
        query = await translateToScryfall(input, commanderCard);
      } catch {
        query = input;
      }
    }

    const settings = getSettings();
    if (settings.fullLoadingAnimation) {
      const phase = hasSearchedThisSession ? "animating-short" : "animating-full";
      hasSearchedThisSession = true;
      const duration = phase === "animating-full" ? 2000 : 400;
      setLocalLoading(phase);
      setTimeout(() => {
        setLocalLoading(false);
        onSearch(query);
      }, duration);
    } else {
      hasSearchedThisSession = true;
      setLocalLoading(false);
      onSearch(query);
    }
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

  const artUrl = commanderCard ? getCardImage(commanderCard, "art_crop") : null;
  const showAnimation = localLoading === "animating-full" || localLoading === "animating-short";

  return (
    <>
      <style>{ANIM_CSS}</style>

      {showAnimation && <LoadingOverlay phase={localLoading} />}

      <div style={{
        minHeight: "100dvh",
        background: "var(--bg)",
        color: "var(--text)",
        fontFamily: "'Space Grotesk', sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingBottom: `calc(${NAV_HEIGHT}px + env(safe-area-inset-bottom))`,
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
          <div style={{ padding: "48px 0 20px" }}>
            <div style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 48, lineHeight: 1,
              letterSpacing: "0.04em",
              color: "var(--text)",
            }}>
              DECK STACK
            </div>
          </div>

          {/* ── Hero area ── */}
          <div style={{
            position: "relative",
            width: "100%",
            height: 220,
            background: "var(--panel)",
            borderRadius: 16,
            marginBottom: 36,
            overflow: "visible",
            flexShrink: 0,
          }}>
            <div style={{
              position: "absolute", inset: 0,
              borderRadius: 16, overflow: "hidden",
              background: "var(--panel)",
            }}>
              {artUrl && (
                <img
                  src={artUrl}
                  alt={commanderCard?.name}
                  draggable={false}
                  style={{
                    width: "100%", height: "100%",
                    objectFit: "cover", objectPosition: "center top",
                    display: "block",
                    transition: "opacity 0.3s ease",
                  }}
                />
              )}
              {artUrl && (
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(to bottom, rgba(13,13,15,0.1) 50%, rgba(13,13,15,0.7) 100%)",
                }} />
              )}
            </div>

            {/* Commander pill */}
            <button
              onClick={handlePillClick}
              style={{
                position: "absolute",
                bottom: -18, left: "50%",
                transform: "translateX(-50%)",
                background: commanderCard ? "rgba(167,139,250,0.15)" : "rgba(13,13,15,0.92)",
                border: `1px solid ${commanderCard ? "rgba(167,139,250,0.5)" : "rgba(255,255,255,0.18)"}`,
                borderRadius: 20,
                padding: "8px 16px 8px 12px",
                display: "flex", alignItems: "center", gap: 7,
                cursor: "pointer", backdropFilter: "blur(8px)",
                whiteSpace: "nowrap", maxWidth: "calc(100% - 40px)",
                transition: "border-color 0.2s, background 0.2s",
              }}
            >
              <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>👑</span>
              <span style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 13,
                color: commanderCard ? "var(--secondary)" : "var(--muted)",
                overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {commanderCard ? commanderCard.name : "Set commander…"}
              </span>
              {commanderCard && (
                <span style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0, marginLeft: 2 }}>✕</span>
              )}
            </button>
          </div>

          {/* ── Commander search panel (expanded) ── */}
          {cmdExpanded && (
            <div style={{ marginBottom: 16, position: "relative" }}>
              <div style={{
                background: "var(--panel)",
                border: "1px solid rgba(201,168,76,0.25)",
                borderRadius: 14,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
                  <span style={{
                    fontSize: 16, flexShrink: 0,
                    opacity: cmdFocused || cmdQuery ? 1 : 0.45,
                    transition: "opacity 0.15s",
                  }}>👑</span>
                  <input
                    ref={cmdInputRef}
                    type="text"
                    value={cmdQuery}
                    onChange={e => setCmdQuery(e.target.value)}
                    onFocus={() => { setCmdFocused(true); cmdResults.length > 0 && setCmdOpen(true); }}
                    onBlur={() => { setCmdFocused(false); setTimeout(() => setCmdOpen(false), 150); }}
                    placeholder="Search for a commander…"
                    autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
                    style={{
                      flex: 1, background: "none", border: "none", outline: "none",
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 16, color: "var(--text)",
                      caretColor: "var(--secondary)",
                    }}
                  />
                  <button
                    onClick={() => { setCmdExpanded(false); setCmdQuery(""); setCmdResults([]); }}
                    style={{
                      background: "transparent", border: "none",
                      color: "var(--muted)", cursor: "pointer",
                      fontSize: 14, padding: "4px", lineHeight: 1, flexShrink: 0,
                    }}
                  >✕</button>
                </div>

                {cmdOpen && cmdResults.length > 0 && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                    background: "var(--panel2)", borderRadius: 12,
                    border: "1px solid rgba(201,168,76,0.2)",
                    overflow: "hidden", zIndex: 50,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
                  }}>
                    {cmdResults.map(card => {
                      const thumb = getCardImage(card, "art_crop");
                      return (
                        <div
                          key={card.id}
                          onMouseDown={() => selectCommander(card)}
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "8px 12px", cursor: "pointer",
                            borderBottom: "1px solid rgba(255,255,255,0.05)",
                          }}
                          onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                          onMouseOut={e => e.currentTarget.style.background = "transparent"}
                        >
                          {thumb && (
                            <img
                              src={thumb}
                              alt={card.name}
                              draggable={false}
                              style={{ width: 48, height: 34, objectFit: "cover", borderRadius: 4, flexShrink: 0 }}
                            />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 13, color: "var(--text)",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>{card.name}</div>
                            <div style={{ display: "flex", gap: 3, marginTop: 3 }}>
                              {card.color_identity?.map(c => <ColorPip key={c} color={c} />)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{
                  fontSize: 11.5,
                  color: cmdQuery.trim() ? "#C9A84C" : "var(--muted)",
                  padding: "0 14px 10px",
                  transition: "color 0.15s",
                }}>
                  {cmdQuery.trim()
                    ? "✦ Color identity filter will be applied"
                    : "Sets color identity filter — only matching cards will appear"
                  }
                </div>
              </div>
            </div>
          )}

          {/* ── Search section ── */}
          <div style={{ marginBottom: 10 }}>
            <div style={{
              fontSize: 10, letterSpacing: "0.15em",
              color: "var(--muted)", marginBottom: 8,
            }}>
              SEARCH YOUR STACK
            </div>

            {/* JEEVES_BLURB — rotating tip */}
            <div style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12,
              color: "var(--muted)",
              marginBottom: 10,
              lineHeight: 1.4,
            }}>
              {TIPS[tipIndex]}
            </div>

            {/* Input */}
            <div style={{
              background: "var(--panel)",
              border: `1px solid ${brewInput.trim() ? "rgba(91,143,255,0.4)" : "rgba(255,255,255,0.12)"}`,
              borderRadius: 14,
              transition: "border-color 0.15s",
              marginBottom: 8,
            }}>
              <input
                type="text"
                value={brewInput}
                onChange={e => { if (!isDisabled) setBrewInput(e.target.value); }}
                onKeyDown={handleBrewKeyDown}
                onFocus={() => { setHistoryIndex(-1); setDraftInput(""); }}
                placeholder={placeholder}
                autoComplete="off" autoCorrect="off" spellCheck={false}
                readOnly={isDisabled}
                style={{
                  width: "100%",
                  background: "none", border: "none", outline: "none",
                  padding: "14px 16px",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 15,
                  color: isDisabled ? "var(--muted)" : "var(--text)",
                  caretColor: "var(--primary)",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Mode toggle */}
            <div style={{ textAlign: "right", marginBottom: 16 }}>
              <button
                onClick={toggleRawMode}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 11, color: "var(--muted)",
                  letterSpacing: "0.05em", textDecoration: "underline",
                  padding: 0,
                }}
              >
                {rawMode ? "switch to NLP" : "switch to raw query"}
              </button>
            </div>

            {/* SEARCH button */}
            <button
              onClick={handleSearch}
              disabled={isDisabled || !brewInput.trim()}
              style={{
                width: "100%",
                background: (isDisabled || !brewInput.trim()) ? "transparent" : "rgba(91,143,255,0.1)",
                border: `1.5px solid ${(isDisabled || !brewInput.trim()) ? "rgba(255,255,255,0.1)" : "var(--primary)"}`,
                borderRadius: 16,
                padding: "18px 24px",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                cursor: (isDisabled || !brewInput.trim()) ? "default" : "pointer",
                transition: "background 0.15s, border-color 0.15s",
              }}
            >
              {localLoading === "translating" && (
                <div style={{
                  width: 16, height: 16, borderRadius: "50%",
                  border: "2px solid rgba(91,143,255,0.3)",
                  borderTopColor: "var(--primary)",
                  animation: "ds-spinner 0.8s linear infinite",
                  flexShrink: 0,
                }} />
              )}
              <span style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 22, letterSpacing: "0.12em",
                color: isDisabled ? "rgba(255,255,255,0.2)" : "var(--primary)",
              }}>
                {localLoading === "translating" ? "THINKING…" : "SEARCH"}
              </span>
            </button>
          </div>

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
    </>
  );
}
