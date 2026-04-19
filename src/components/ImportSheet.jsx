import { useState } from "react";

const UA = "DeckStack/1.0 (deck-stack.vercel.app)";
const sleep = ms => new Promise(r => setTimeout(r, ms));

function parseMoxfieldId(url) {
  const m = url.match(/moxfield\.com\/decks\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

function parseDeckText(text) {
  const lines = text.split("\n");
  const cards = [];
  let nextIsCommander = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { nextIsCommander = false; continue; }

    if (trimmed === "// Commander" || trimmed === "# Commander") {
      nextIsCommander = true;
      continue;
    }
    if (trimmed.startsWith("//") || trimmed.startsWith("#")) continue;

    let name, qty;
    const m = trimmed.match(/^(\d+)[xX]?\s+(.+)$/);
    if (m) {
      qty = parseInt(m[1], 10);
      name = m[2].trim();
    } else {
      qty = 1;
      name = trimmed;
    }

    // Strip trailing set codes: " (M21) 123" or " (M21)"
    name = name.replace(/\s+\([A-Z0-9]{2,6}\)\s+\d+$/, "").trim();
    name = name.replace(/\s+\([A-Z0-9]{2,6}\)$/, "").trim();

    if (name) cards.push({ name, qty, isCommander: nextIsCommander });
    nextIsCommander = false;
  }

  return cards;
}

async function resolveByCollection(names) {
  const BATCH = 75;
  const resolved = [];
  const notFound = [];

  for (let i = 0; i < names.length; i += BATCH) {
    const batch = names.slice(i, i + BATCH);
    const res = await fetch("https://api.scryfall.com/cards/collection", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({ identifiers: batch.map(n => ({ name: n })) }),
    });
    if (!res.ok) throw new Error(`Scryfall error: ${res.status}`);
    const json = await res.json();
    resolved.push(...(json.data ?? []));
    notFound.push(...(json.not_found ?? []).map(nf => nf.name ?? String(nf)));
    if (i + BATCH < names.length) await sleep(150);
  }

  return { resolved, notFound };
}

function FieldLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600,
      letterSpacing: "0.12em", textTransform: "uppercase",
      color: "var(--muted)", marginBottom: 6,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {children}
    </div>
  );
}

export default function ImportSheet({ open, onClose, onImport }) {
  const [text,        setText]        = useState("");
  const [urlInput,    setUrlInput]    = useState("");
  const [status,      setStatus]      = useState("idle"); // idle | working | success
  const [statusLabel, setStatusLabel] = useState("");
  const [errorMsg,    setErrorMsg]    = useState("");
  const [warning,     setWarning]     = useState("");
  const [importCount, setImportCount] = useState(0);

  function resetState() {
    setStatus("idle");
    setStatusLabel("");
    setErrorMsg("");
    setWarning("");
  }

  function handleClose() {
    if (status === "working") return;
    resetState();
    onClose();
  }

  async function handleImport() {
    const hasUrl  = urlInput.trim().length > 0;
    const hasText = text.trim().length > 0;
    if (!hasUrl && !hasText) {
      setErrorMsg("Paste a decklist or enter a Moxfield URL.");
      return;
    }

    setStatus("working");
    setErrorMsg("");
    setWarning("");

    let deckText = text;

    // ── Moxfield fetch ────────────────────────────────────────────────────────
    if (hasUrl) {
      const deckId = parseMoxfieldId(urlInput.trim());
      if (!deckId) {
        setErrorMsg("Invalid Moxfield URL — paste the text export instead.");
        setStatus("idle");
        return;
      }
      try {
        setStatusLabel("Fetching deck…");
        const res = await fetch(`/api/moxfield?id=${encodeURIComponent(deckId)}`);
        if (!res.ok) throw new Error(`Moxfield error: ${res.status}`);
        const data = await res.json();

        const commanders = Object.values(data.boards?.commanders?.cards ?? {});
        const mainboard  = Object.values(data.boards?.mainboard?.cards ?? {});

        let built = "";
        if (commanders.length > 0) {
          built += "// Commander\n";
          built += commanders.map(e => `1x ${e.card.name}`).join("\n") + "\n\n";
        }
        built += mainboard.map(e => `${e.quantity}x ${e.card.name}`).join("\n");
        deckText = built;
      } catch {
        if (hasText) {
          setWarning("Couldn't fetch deck — using pasted text instead.");
        } else {
          setErrorMsg("Couldn't fetch deck — paste the text export instead.");
          setStatus("idle");
          return;
        }
      }
    }

    // ── Parse ─────────────────────────────────────────────────────────────────
    const parsed = parseDeckText(deckText);
    if (parsed.length === 0) {
      setErrorMsg("No cards found in the decklist.");
      setStatus("idle");
      return;
    }

    // ── Resolve via Scryfall /cards/collection ────────────────────────────────
    const uniqueNames = [...new Set(parsed.map(c => c.name))];
    setStatusLabel(`Resolving ${uniqueNames.length} cards…`);

    let resolved, notFound;
    try {
      ({ resolved, notFound } = await resolveByCollection(uniqueNames));
    } catch (err) {
      setErrorMsg(err.message);
      setStatus("idle");
      return;
    }

    if (resolved.length === 0) {
      setErrorMsg("No cards could be matched.");
      setStatus("idle");
      return;
    }

    // ── Build pile ────────────────────────────────────────────────────────────
    const resolvedMap = new Map(resolved.map(c => [c.name.toLowerCase(), c]));
    const pile = [];
    let commanderCard = null;

    for (const entry of parsed) {
      const card = resolvedMap.get(entry.name.toLowerCase());
      if (!card) continue;
      for (let q = 0; q < entry.qty; q++) {
        const cardEntry = { ...card, instanceId: crypto.randomUUID() };
        pile.push(cardEntry);
        if (entry.isCommander && !commanderCard) {
          commanderCard = cardEntry;
        }
      }
    }

    if (notFound.length > 0) {
      const names = notFound.join(", ");
      setWarning(`${notFound.length} card${notFound.length !== 1 ? "s" : ""} couldn't be found: ${names}`);
    }

    setImportCount(pile.length);
    setStatus("success");
    setStatusLabel("");

    onImport(pile, commanderCard);

    setTimeout(() => {
      resetState();
      setText("");
      setUrlInput("");
      onClose();
    }, 1500);
  }

  const isWorking = status === "working";
  const isSuccess = status === "success";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.65)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.28s",
        }}
      />

      {/* Sheet */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 201,
        display: "flex", justifyContent: "center",
        transform: open ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
        pointerEvents: open ? "auto" : "none",
      }}>
        <div style={{
          width: "100%", maxWidth: 600,
          maxHeight: "90dvh",
          background: "var(--bg)",
          borderRadius: "20px 20px 0 0",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          borderLeft: "1px solid rgba(255,255,255,0.06)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>

          {/* Drag handle */}
          <div style={{ textAlign: "center", paddingTop: 12, paddingBottom: 2, flexShrink: 0 }}>
            <div style={{
              display: "inline-block",
              width: 36, height: 4, borderRadius: 2,
              background: "rgba(255,255,255,0.18)",
            }} />
          </div>

          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center",
            padding: "8px 18px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            flexShrink: 0,
          }}>
            <span style={{
              flex: 1,
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 18, letterSpacing: 4,
              color: "var(--secondary)",
            }}>
              IMPORT DECK
            </span>
            <button
              onClick={handleClose}
              disabled={isWorking}
              style={{
                background: "transparent", border: "none",
                color: "rgba(255,255,255,0.45)", fontSize: 18,
                cursor: isWorking ? "default" : "pointer",
                padding: "4px 6px", lineHeight: 1,
                opacity: isWorking ? 0.4 : 1,
              }}
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div style={{
            flex: 1, overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            padding: "20px 18px 36px",
          }}>

            {/* Moxfield URL */}
            <div style={{ marginBottom: 16 }}>
              <FieldLabel>Moxfield URL (optional)</FieldLabel>
              <input
                type="url"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="https://www.moxfield.com/decks/…"
                disabled={isWorking || isSuccess}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "var(--panel)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 10, padding: "12px 14px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14, color: "var(--text)",
                  outline: "none", caretColor: "var(--secondary)",
                }}
              />
            </div>

            {/* Decklist textarea */}
            <div style={{ marginBottom: 16 }}>
              <FieldLabel>Paste decklist</FieldLabel>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={"1x Sol Ring\n1x Command Tower\n\n// or paste MTGO / Arena / Moxfield text export"}
                rows={9}
                disabled={isWorking || isSuccess}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "var(--panel)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 10, padding: "12px 14px",
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 13, color: "var(--text)",
                  outline: "none", caretColor: "var(--secondary)",
                  resize: "vertical", lineHeight: 1.65,
                }}
              />
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6 }}>
                Accepts <code style={{ fontFamily: "inherit", opacity: 0.8 }}>1x Card Name</code>, <code style={{ fontFamily: "inherit", opacity: 0.8 }}>1 Card Name</code>, or plain names — MTGO, Arena, and Moxfield exports all work.
              </div>
            </div>

            {/* Error */}
            {errorMsg && (
              <div style={{
                background: "rgba(255,80,80,0.09)",
                border: "1px solid rgba(255,80,80,0.25)",
                borderRadius: 8, padding: "10px 14px",
                fontSize: 13, color: "#ff6868",
                marginBottom: 14, lineHeight: 1.5,
              }}>
                {errorMsg}
              </div>
            )}

            {/* Warning */}
            {warning && (
              <div style={{
                background: "rgba(255,180,60,0.08)",
                border: "1px solid rgba(255,180,60,0.22)",
                borderRadius: 8, padding: "10px 14px",
                fontSize: 13, color: "#ffb84a",
                marginBottom: 14, lineHeight: 1.5,
              }}>
                {warning}
              </div>
            )}

            {/* IMPORT button */}
            <button
              onClick={!isWorking && !isSuccess ? handleImport : undefined}
              style={{
                width: "100%",
                background: isSuccess
                  ? "rgba(60,200,100,0.1)"
                  : isWorking
                    ? "transparent"
                    : "rgba(167,139,250,0.1)",
                border: `1.5px solid ${
                  isSuccess
                    ? "rgba(60,200,100,0.45)"
                    : isWorking
                      ? "rgba(255,255,255,0.1)"
                      : "var(--secondary)"
                }`,
                borderRadius: 14,
                padding: "16px 24px",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                cursor: isWorking || isSuccess ? "default" : "pointer",
                transition: "background 0.2s, border-color 0.2s",
              }}
            >
              <span style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 20, letterSpacing: "0.12em",
                color: isSuccess
                  ? "var(--success)"
                  : isWorking
                    ? "rgba(255,255,255,0.25)"
                    : "var(--secondary)",
              }}>
                {isSuccess
                  ? `IMPORTED ${importCount} CARDS`
                  : isWorking
                    ? (statusLabel || "IMPORTING…")
                    : "IMPORT"
                }
              </span>
            </button>

          </div>
        </div>
      </div>
    </>
  );
}
