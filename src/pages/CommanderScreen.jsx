import { useState, useEffect, useRef, useCallback } from "react";
import { fetchFirstPage, getCardImage, formatManaCost } from "../lib/scryfall.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const COLOR_OPTIONS = [
  { id: "W", label: "W", title: "White"     },
  { id: "U", label: "U", title: "Blue"      },
  { id: "B", label: "B", title: "Black"     },
  { id: "R", label: "R", title: "Red"       },
  { id: "G", label: "G", title: "Green"     },
  { id: "C", label: "C", title: "Colorless" },
];

// Tag slugs that belong to veggie categories — filter these out of affiliated
const VEGGIE_SLUGS = new Set([
  "ramp", "mana-rock", "mana-dork",
  "card-draw", "card-advantage",
  "removal", "targeted-removal",
  "wrath", "fetchland", "shockland",
]);

const FLAVOR_TEXTS = [
  "CONSULTING THE ARCHIVES...",
  "SIFTING THROUGH THE MULTIVERSE...",
  "INTERROGATING THE ORACLE...",
  "COMMUNING WITH EMRAKUL...",
  "SHUFFLING THE BLIND ETERNITIES...",
];

function buildVeggieQueries(colorId) {
  const id = colorId || "C";
  return [
    { cat: "ramp",            q: `(oracletag:ramp OR oracletag:mana-rock OR oracletag:mana-dork) id<=${id}` },
    { cat: "card-advantage",  q: `(oracletag:card-draw OR oracletag:card-advantage) id<=${id}` },
    { cat: "disruption",      q: `(oracletag:removal OR oracletag:targeted-removal) id<=${id}` },
    { cat: "mass-disruption", q: `oracletag:wrath id<=${id}` },
    { cat: "lands",           q: `(oracletag:fetchland OR oracletag:shockland OR (type:land id<=${id} -is:basic))` },
  ];
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  page: {
    minHeight: "100vh",
    background: "var(--bg)",
    color: "var(--text)",
    fontFamily: "'IBM Plex Mono', monospace",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "0 0 56px",
  },
  header: {
    width: "100%",
    maxWidth: 560,
    padding: "32px 20px 8px",
    textAlign: "center",
  },
  title: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 48,
    letterSpacing: 6,
    color: "var(--primary)",
    lineHeight: 1,
  },
  subtitle: {
    fontSize: 11,
    color: "var(--muted)",
    letterSpacing: 3,
    marginTop: 4,
  },
  section: {
    width: "100%",
    maxWidth: 560,
    padding: "0 20px",
    marginTop: 24,
  },
  sectionLabel: {
    fontSize: 10,
    color: "var(--muted)",
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  input: {
    width: "100%",
    background: "var(--panel2)",
    border: "1px solid rgba(91,143,255,0.18)",
    borderRadius: 8,
    padding: "10px 12px",
    color: "var(--text)",
    fontSize: 12,
    outline: "none",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  colorBtn: (active) => ({
    width: 40,
    height: 40,
    borderRadius: 8,
    border: `1px solid ${active ? "var(--primary)" : "rgba(255,255,255,0.1)"}`,
    background: active ? "rgba(91,143,255,0.18)" : "transparent",
    color: active ? "var(--primary)" : "var(--muted)",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'IBM Plex Mono', monospace",
    transition: "all 0.15s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }),
  buildBtn: {
    width: "100%",
    padding: "16px",
    borderRadius: 12,
    border: "none",
    background: "var(--primary)",
    color: "#fff",
    fontSize: 16,
    fontWeight: 700,
    fontFamily: "'Bebas Neue', sans-serif",
    letterSpacing: 5,
    cursor: "pointer",
    transition: "background 0.2s",
    marginTop: 16,
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function CommanderScreen({ onCommanderReady }) {
  // ── Type-ahead ────────────────────────────────────────────────────────────
  const [searchQuery,   setSearchQuery]   = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown,  setShowDropdown]  = useState(false);

  // ── Browse ────────────────────────────────────────────────────────────────
  const [browseColors,  setBrowseColors]  = useState([]);
  const [browseResults, setBrowseResults] = useState([]);
  const [browseLoading, setBrowseLoading] = useState(false);

  // ── Phase + selection ─────────────────────────────────────────────────────
  const [selectedCommander, setSelectedCommander] = useState(null);
  const [phase,             setPhase]             = useState("pick"); // "pick" | "confirm" | "building"

  // ── Lucky ─────────────────────────────────────────────────────────────────
  const [luckyLoading, setLuckyLoading] = useState(false);
  const [luckyMsg,     setLuckyMsg]     = useState("");

  // ── Build ─────────────────────────────────────────────────────────────────
  const [buildMsg,   setBuildMsg]   = useState(FLAVOR_TEXTS[0]);
  const [buildError, setBuildError] = useState(null);

  const abortRef = useRef(null);

  // ── Type-ahead search (debounced 300ms) ───────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await fetchFirstPage(`is:commander name:${searchQuery.trim()}`);
        setSearchResults(results.slice(0, 8));
        setShowDropdown(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Browse by color identity ──────────────────────────────────────────────
  useEffect(() => {
    if (browseColors.length === 0) {
      setBrowseResults([]);
      return;
    }
    const colorId = browseColors.join("");
    const ctrl = new AbortController();
    setBrowseLoading(true);
    fetchFirstPage(`is:commander id<=${colorId}`, { signal: ctrl.signal })
      .then(results => setBrowseResults(results))
      .catch(() => {})
      .finally(() => setBrowseLoading(false));
    return () => ctrl.abort();
  }, [browseColors]);

  const toggleBrowseColor = (id) =>
    setBrowseColors(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );

  // ── I'm Feeling Lucky ─────────────────────────────────────────────────────
  const handleLucky = async () => {
    setLuckyLoading(true);
    setLuckyMsg("CONSULTING THE BLIND ETERNITIES...");
    try {
      const res = await fetch("https://api.scryfall.com/cards/random?q=is:commander");
      if (!res.ok) throw new Error("The fates are silent.");
      const card = await res.json();
      setSelectedCommander(card);
      setPhase("confirm");
    } catch (e) {
      setLuckyMsg(e.message ?? "Something went wrong.");
    } finally {
      setLuckyLoading(false);
    }
  };

  // ── Select a commander ────────────────────────────────────────────────────
  const selectCommander = (card) => {
    setSelectedCommander(card);
    setShowDropdown(false);
    setSearchQuery("");
    setPhase("confirm");
  };

  // ── Build card pool (Phase 2) ─────────────────────────────────────────────
  const handleBuild = useCallback(async () => {
    if (!selectedCommander) return;
    setPhase("building");
    setBuildError(null);

    const colorId = selectedCommander.color_identity?.length
      ? selectedCommander.color_identity.join("")
      : "C";

    // Cycle flavor text every 1.5s
    let textIdx = 0;
    const textInterval = setInterval(() => {
      textIdx = (textIdx + 1) % FLAVOR_TEXTS.length;
      setBuildMsg(FLAVOR_TEXTS[textIdx]);
    }, 1500);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      // ── Step 1: parallel veggie fetches ──────────────────────────────────
      const veggieQueries = buildVeggieQueries(colorId);
      const veggieResults = await Promise.all(
        veggieQueries.map(({ cat, q }) =>
          fetchFirstPage(q, { signal: ctrl.signal })
            .then(cards => cards.map(c => ({ ...c, _vegCategory: cat })))
            .catch(() => [])
        )
      );

      // ── Step 2: tagger API for affiliated cards ───────────────────────────
      let affiliatedCards = [];
      try {
        const taggerRes = await fetch(
          `https://taggerapi.scryfall.com/tags/card/${selectedCommander.id}`,
          { signal: ctrl.signal }
        );
        const taggerData = await taggerRes.json();
        // Log raw response so you can verify the tag shape
        console.log("[DeckSwipe] Tagger API raw response for", selectedCommander.name, ":", taggerData);

        // Handle multiple possible response shapes
        const rawTags = taggerData.tags ?? taggerData.data ?? (Array.isArray(taggerData) ? taggerData : []);
        const affiliatedSlugs = rawTags
          .map(t => t.slug ?? t.name ?? "")
          .filter(s => s && !VEGGIE_SLUGS.has(s))
          .slice(0, 6); // cap to avoid overly broad queries

        if (affiliatedSlugs.length > 0) {
          const aQ = affiliatedSlugs.map(s => `oracletag:${s}`).join(" OR ");
          affiliatedCards = await fetchFirstPage(
            `(${aQ}) id<=${colorId}`,
            { signal: ctrl.signal }
          )
            .then(cards => cards.map(c => ({ ...c, _vegCategory: "affiliated" })))
            .catch(() => []);
        }
      } catch (e) {
        if (e.name === "AbortError") throw e;
        console.warn("[DeckSwipe] Tagger API failed, skipping affiliated:", e.message);
      }

      // ── Step 3: merge, deduplicate, cap at 100 ────────────────────────────
      const all = [...veggieResults.flat(), ...affiliatedCards];
      const seen = new Set([selectedCommander.id]);
      const deduped = [];
      for (const card of all) {
        if (!seen.has(card.id)) {
          seen.add(card.id);
          deduped.push(card);
        }
      }
      const pool = deduped.slice(0, 100);

      clearInterval(textInterval);
      onCommanderReady(selectedCommander, pool);
    } catch (e) {
      clearInterval(textInterval);
      if (e.name === "AbortError") return;
      setBuildError(e.message ?? "Failed to build card pool.");
      setPhase("confirm");
    }
  }, [selectedCommander, onCommanderReady]);

  // ── Render: building ──────────────────────────────────────────────────────
  if (phase === "building") {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--bg)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        fontFamily: "'IBM Plex Mono', monospace",
        textAlign: "center", padding: 32,
      }}>
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 28, letterSpacing: 5,
          color: "var(--primary)", lineHeight: 1.3, marginBottom: 16,
        }}>
          {buildMsg}
        </div>
        {selectedCommander && (
          <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 1 }}>
            building around {selectedCommander.name}…
          </div>
        )}
      </div>
    );
  }

  // ── Render: confirm ───────────────────────────────────────────────────────
  if (phase === "confirm" && selectedCommander) {
    const art     = getCardImage(selectedCommander, "normal");
    const artCrop = getCardImage(selectedCommander, "art_crop");
    const ci      = selectedCommander.color_identity ?? [];
    return (
      <div style={{
        minHeight: "100vh", background: "var(--bg)",
        display: "flex", flexDirection: "column", alignItems: "center",
        fontFamily: "'IBM Plex Mono', monospace",
        overflow: "hidden", position: "relative",
      }}>
        {/* Blurred art background */}
        {artCrop && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 0,
            backgroundImage: `url(${artCrop})`,
            backgroundSize: "cover", backgroundPosition: "center",
            filter: "blur(24px) brightness(0.18)",
            transform: "scale(1.1)",
          }} />
        )}

        {/* Back link */}
        <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 480, padding: "20px 20px 0" }}>
          <button
            onClick={() => { setPhase("pick"); setSelectedCommander(null); setBuildError(null); }}
            style={{
              background: "transparent", border: "none",
              color: "var(--muted)", fontSize: 12,
              letterSpacing: 1, cursor: "pointer",
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            ← CHOOSE ANOTHER
          </button>
        </div>

        {/* Card image */}
        <div style={{ position: "relative", zIndex: 10, marginTop: 16 }}>
          {art ? (
            <img
              src={art}
              alt={selectedCommander.name}
              style={{
                width: "min(90vw, 360px)",
                borderRadius: 16,
                boxShadow: "0 24px 64px rgba(0,0,0,0.8)",
                display: "block",
              }}
            />
          ) : (
            <div style={{
              width: 280, height: 390, background: "var(--panel)", borderRadius: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--muted)", fontSize: 12,
            }}>
              {selectedCommander.name}
            </div>
          )}
        </div>

        {/* Card info */}
        <div style={{ position: "relative", zIndex: 10, textAlign: "center", marginTop: 16, padding: "0 20px" }}>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 28, letterSpacing: 3, color: "var(--text)",
          }}>
            {selectedCommander.name}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, letterSpacing: 1 }}>
            {selectedCommander.type_line}
          </div>
          <div style={{ fontSize: 11, color: "var(--secondary)", marginTop: 4 }}>
            {formatManaCost(selectedCommander.mana_cost)}
            {ci.length > 0 && ` · ${ci.join("")}`}
          </div>
        </div>

        {/* Build button */}
        <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 480, padding: "0 20px", marginTop: 8 }}>
          {buildError && (
            <div style={{
              padding: "10px 14px", marginBottom: 12,
              background: "rgba(255,77,109,0.08)",
              border: "1px solid rgba(255,77,109,0.25)",
              borderRadius: 10, color: "var(--danger)", fontSize: 11,
            }}>
              {buildError}
            </div>
          )}
          <button onClick={handleBuild} style={S.buildBtn}>
            BUILD AROUND THIS →
          </button>
        </div>
      </div>
    );
  }

  // ── Render: pick ──────────────────────────────────────────────────────────
  return (
    <div style={S.page}>

      {/* Header */}
      <div style={S.header}>
        <div style={S.title}>DECK SWIPE</div>
        <div style={S.subtitle}>EASY MODE · PICK YOUR COMMANDER</div>
      </div>

      {/* ── Type-ahead search ── */}
      <div style={{ ...S.section, position: "relative" }}>
        <div style={S.sectionLabel}>Search by name</div>
        <div style={{ position: "relative" }}>
          <input
            style={S.input}
            placeholder="e.g. Atraxa, Tergrid, Muldrotha…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          />
          {searchLoading && (
            <div style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              fontSize: 10, color: "var(--muted)",
            }}>
              …
            </div>
          )}

          {/* Type-ahead dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div style={{
              position: "absolute", left: 0, right: 0, top: "calc(100% + 4px)",
              background: "var(--panel)",
              border: "1px solid rgba(91,143,255,0.2)",
              borderRadius: 10, zIndex: 100, overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            }}>
              {searchResults.map(card => {
                const thumb = getCardImage(card, "art_crop");
                const ci    = card.color_identity ?? [];
                return (
                  <button
                    key={card.id}
                    onMouseDown={() => selectCommander(card)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center",
                      gap: 10, padding: "9px 12px",
                      background: "transparent", border: "none",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      cursor: "pointer", textAlign: "left",
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  >
                    {thumb && (
                      <img
                        src={thumb}
                        alt=""
                        style={{ width: 48, height: 34, objectFit: "cover", borderRadius: 4, flexShrink: 0 }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12, color: "var(--text)", fontWeight: 600,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {card.name}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                        {ci.join("") || "C"} · {formatManaCost(card.mana_cost)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Browse by color identity ── */}
      <div style={S.section}>
        <div style={S.sectionLabel}>Browse by color identity</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {COLOR_OPTIONS.map(c => (
            <button
              key={c.id}
              title={c.title}
              style={S.colorBtn(browseColors.includes(c.id))}
              onClick={() => toggleBrowseColor(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Browse grid */}
        {browseLoading && (
          <div style={{ marginTop: 14, fontSize: 11, color: "var(--muted)", letterSpacing: 2 }}>
            LOADING…
          </div>
        )}
        {!browseLoading && browseColors.length > 0 && browseResults.length > 0 && (
          <div style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(70px, 1fr))",
            gap: 8,
            maxHeight: 260,
            overflowY: "auto",
          }}>
            {browseResults.map(card => {
              const art = getCardImage(card, "art_crop");
              return (
                <button
                  key={card.id}
                  onClick={() => selectCommander(card)}
                  title={card.name}
                  style={{
                    background: "var(--panel)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 8, cursor: "pointer",
                    padding: 0, overflow: "hidden",
                    display: "flex", flexDirection: "column",
                    transition: "border-color 0.15s",
                  }}
                >
                  {art ? (
                    <img
                      src={art}
                      alt={card.name}
                      style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <div style={{
                      width: "100%", aspectRatio: "4/3", background: "var(--panel2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 8, color: "var(--muted)", padding: 4, textAlign: "center",
                    }}>
                      {card.name}
                    </div>
                  )}
                  <div style={{
                    padding: "4px 5px", fontSize: 7.5, color: "var(--muted)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {card.name}
                  </div>
                </button>
              );
            })}
          </div>
        )}
        {!browseLoading && browseColors.length > 0 && browseResults.length === 0 && (
          <div style={{ marginTop: 12, fontSize: 11, color: "var(--muted)" }}>
            No commanders found for that identity.
          </div>
        )}
      </div>

      {/* ── I'm Feeling Lucky ── */}
      <div style={{ ...S.section, display: "flex", justifyContent: "center", marginTop: 32 }}>
        <button
          onClick={handleLucky}
          disabled={luckyLoading}
          style={{
            padding: "12px 28px",
            borderRadius: 10,
            border: "1px dashed rgba(251,191,36,0.5)",
            background: "rgba(251,191,36,0.05)",
            color: luckyLoading ? "rgba(251,191,36,0.4)" : "#fbbf24",
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 18, letterSpacing: 3,
            cursor: luckyLoading ? "default" : "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          }}
        >
          {luckyLoading ? luckyMsg : "I'M FEELING LUCKY"}
          {!luckyLoading && (
            <span style={{
              fontSize: 9, fontFamily: "'IBM Plex Mono', monospace",
              color: "rgba(251,191,36,0.5)", letterSpacing: 2,
              fontStyle: "italic", fontWeight: 400,
            }}>
              let fate decide
            </span>
          )}
        </button>
      </div>

    </div>
  );
}
