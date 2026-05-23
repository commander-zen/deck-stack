import { useState } from "react";

const C = {
  bg: "#08080f",
  panel: "#12121a",
  panel2: "#1a1a24",
  border: "#2a2a3a",
  primary: "#5b8fff",
  success: "#34d399",
  danger: "#ff4d6d",
  muted: "#555566",
  mutedText: "#8888aa",
  text: "#e8e8f0",
};

const DEFAULT_SYSTEM_PROMPT =
  `You are an expert Magic: The Gathering Commander deck analyst. ` +
  `When given a commander and bracket level, analyze queries about deck building, ` +
  `card choices, strategy, and synergies. Be specific and practical. Reference the ` +
  `bracket system where relevant (1=Precon, 2=Upgraded precon, 3=Focused, ` +
  `4=Optimized, 5=cEDH). Use the provided knowledge context when answering.`;

const DEFAULT_RAG_CHUNKS = [
  {
    id: "commander-basics",
    title: "Commander Format Basics",
    content:
      "Commander is a 100-card singleton format. Each deck has a legendary creature as the commander. " +
      "The deck's color identity must match the commander's color identity. Players start at 40 life. " +
      "Commander damage (21 from one commander) is an alternate win condition.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "bracket-system",
    title: "Power Level Brackets",
    content:
      "Bracket 1: Preconstructed-level, no tutors, simple strategies. " +
      "Bracket 2: Upgraded precons, basic synergies, some tutors. " +
      "Bracket 3: Focused synergy, efficient win conditions, moderate tutors. " +
      "Bracket 4: Optimized with fast mana, strong combos, many tutors. " +
      "Bracket 5: cEDH — competitive, fast mana (Mana Crypt, Mox Diamond), instant-speed wins, fully optimal.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "deck-pillars",
    title: "Commander Deck Pillars (WREC Template)",
    content:
      "A balanced Commander deck: 10 ramp pieces, 12 card advantage pieces, " +
      "12 interaction/disruption pieces, 6 mass disruption (board wipes), " +
      "38 mana base (lands), 30 plan cards (win conditions and synergy pieces).",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "color-identity",
    title: "Color Identity Rules",
    content:
      "Color identity includes all mana symbols in the mana cost AND rules text. " +
      "Basic lands are always legal. Colorless cards are legal in any deck. " +
      "Hybrid mana symbols count for both colors.",
    updatedAt: new Date().toISOString(),
  },
];

function loadStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function Accordion({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          background: C.panel2,
          border: "none",
          color: C.text,
          fontFamily: "'Noto Sans', sans-serif",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 2,
          textTransform: "uppercase",
          cursor: "pointer",
        }}
      >
        <span>{title}</span>
        <span style={{ fontFamily: "'Material Symbols Outlined'", fontStyle: "normal", lineHeight: 1, fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24", fontSize: 14, color: C.muted }}>{open ? "expand_less" : "expand_more"}</span>
      </button>
      {open && (
        <div style={{ padding: 16, background: C.panel, borderTop: `1px solid ${C.border}` }}>
          {children}
        </div>
      )}
    </div>
  );
}

const inputBase = {
  width: "100%",
  padding: "12px 14px",
  background: "#12121a",
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  color: C.text,
  fontFamily: "'Noto Sans', sans-serif",
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
};

const labelBase = {
  display: "block",
  fontSize: 11,
  letterSpacing: 2,
  textTransform: "uppercase",
  color: C.muted,
  marginBottom: 8,
};

export default function NLPTestbed() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("nlp_auth") === "true");
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState(false);

  const [commander, setCommander] = useState("");
  const [bracket, setBracket] = useState(3);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState(null);

  const [ragChunks, setRagChunks] = useState(() => loadStorage("nlp_rag_chunks", DEFAULT_RAG_CHUNKS));
  const [systemPrompt, setSystemPrompt] = useState(() => loadStorage("nlp_system_prompt", DEFAULT_SYSTEM_PROMPT));
  const [ragInput, setRagInput] = useState("");
  const [ragLoading, setRagLoading] = useState(false);
  const [ragError, setRagError] = useState(null);

  const [history, setHistory] = useState([]);

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

  function handlePasswordSubmit(e) {
    e.preventDefault();
    if (password === import.meta.env.VITE_TESTBED_PASSWORD) {
      sessionStorage.setItem("nlp_auth", "true");
      setAuthed(true);
    } else {
      setPwError(true);
      setPassword("");
    }
  }

  async function callClaude(messages, systemOverride) {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemOverride ?? systemPrompt,
        messages,
      }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err?.error?.message ?? `API error ${resp.status}`);
    }
    const data = await resp.json();
    return data.content?.[0]?.text ?? "";
  }

  async function handleRun() {
    if (!query.trim()) return;
    setRunning(true);
    setRunError(null);
    setResult(null);
    try {
      const ragContext = ragChunks.map(c => `## ${c.title}\n${c.content}`).join("\n\n");
      const userMsg =
        `Commander: ${commander || "Not specified"}\n` +
        `Bracket: ${bracket}\n\n` +
        (ragContext ? `Knowledge Context:\n${ragContext}\n\n` : "") +
        `Query: ${query}`;
      const response = await callClaude([{ role: "user", content: userMsg }]);
      setResult(response);
      setHistory(h => [
        { commander, bracket, query, result: response, timestamp: new Date().toISOString() },
        ...h,
      ]);
    } catch (err) {
      setRunError(err.message);
    } finally {
      setRunning(false);
    }
  }

  async function handleRagSubmit(e) {
    e.preventDefault();
    if (!ragInput.trim()) return;
    setRagLoading(true);
    setRagError(null);
    try {
      const chunkSummary = ragChunks
        .map(c => `ID: ${c.id}\nTitle: ${c.title}\nContent: ${c.content}`)
        .join("\n\n---\n\n");
      const updatePrompt =
        `You are managing a RAG knowledge base for a Commander MTG NLP tool. ` +
        `The user provided new knowledge in plain English. Either UPDATE an existing ` +
        `chunk if the knowledge clearly belongs there, or CREATE a new chunk if it's a distinct topic.\n\n` +
        `Existing chunks:\n${chunkSummary}\n\n` +
        `New knowledge: "${ragInput}"\n\n` +
        `Respond with ONLY valid JSON (no markdown fences):\n` +
        `{"action":"update"|"create","chunk":{"id":"kebab-id","title":"Short Title","content":"Full content"}}`;

      const response = await callClaude(
        [{ role: "user", content: updatePrompt }],
        "You are a knowledge base manager. Always respond with valid JSON only, no markdown fences or explanation."
      );

      let parsed;
      try {
        const clean = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        parsed = JSON.parse(clean);
      } catch {
        throw new Error("Claude returned invalid JSON. Try again.");
      }

      const { action, chunk } = parsed;
      if (!chunk?.id || !chunk?.title || !chunk?.content) {
        throw new Error("Invalid chunk format returned.");
      }

      const updated = { ...chunk, updatedAt: new Date().toISOString() };
      setRagChunks(prev => {
        let next;
        if (action === "update") {
          const idx = prev.findIndex(c => c.id === chunk.id);
          next = idx >= 0 ? prev.map((c, i) => (i === idx ? updated : c)) : [...prev, updated];
        } else {
          next = [...prev, updated];
        }
        saveStorage("nlp_rag_chunks", next);
        return next;
      });
      setRagInput("");
    } catch (err) {
      setRagError(err.message);
    } finally {
      setRagLoading(false);
    }
  }

  function handleSystemPromptChange(val) {
    setSystemPrompt(val);
    saveStorage("nlp_system_prompt", val);
  }

  // ── Password gate ──────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{
        minHeight: "100dvh",
        background: C.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Noto Sans', sans-serif",
      }}>
        <form
          onSubmit={handlePasswordSubmit}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, width: 280 }}
        >
          <span style={{ fontFamily: "'Noto Sans', sans-serif", fontSize: 32, letterSpacing: 4, color: C.text }}>
            NLP TESTBED
          </span>
          <span style={{ color: C.muted, fontSize: 13 }}>Commander NLP Tool</span>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setPwError(false); }}
            placeholder="Password"
            autoFocus
            style={{ ...inputBase, border: `1px solid ${pwError ? C.danger : C.border}` }}
          />
          {pwError && <span style={{ color: C.danger, fontSize: 13 }}>Incorrect password</span>}
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "12px 16px",
              background: C.primary,
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontFamily: "'Noto Sans', sans-serif",
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: 2,
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            ENTER
          </button>
        </form>
      </div>
    );
  }

  // ── Main testbed ───────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100dvh",
      background: C.bg,
      color: C.text,
      fontFamily: "'Noto Sans', sans-serif",
      padding: "24px 16px 64px",
      maxWidth: 720,
      margin: "0 auto",
      boxSizing: "border-box",
    }}>
      <h1 style={{
        fontFamily: "'Noto Sans', sans-serif",
        fontSize: 36,
        letterSpacing: 6,
        color: C.text,
        margin: "0 0 4px",
      }}>
        NLP TESTBED
      </h1>
      <p style={{ color: C.muted, fontSize: 13, margin: "0 0 32px" }}>
        Commander NLP Tool — Deck Stack
      </p>

      {/* Commander */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelBase}>Commander</label>
        <input
          type="text"
          value={commander}
          onChange={e => setCommander(e.target.value)}
          placeholder="e.g. Atraxa, Praetors' Voice"
          style={inputBase}
        />
      </div>

      {/* Bracket */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelBase}>Bracket — {bracket}</label>
        <div style={{ display: "flex", gap: 8 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => setBracket(n)}
              style={{
                flex: 1,
                padding: "10px 0",
                background: bracket === n ? C.primary : C.panel,
                border: `1px solid ${bracket === n ? C.primary : C.border}`,
                borderRadius: 8,
                color: bracket === n ? "#fff" : C.muted,
                fontFamily: "'Noto Sans', sans-serif",
                fontSize: 22,
                cursor: "pointer",
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Query */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelBase}>Query</label>
        <textarea
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="What removal should I run? What are the best ramp pieces for this commander?"
          rows={4}
          style={{ ...inputBase, resize: "vertical" }}
        />
      </div>

      <button
        onClick={handleRun}
        disabled={running || !query.trim()}
        style={{
          width: "100%",
          padding: "14px",
          background: running ? C.panel2 : C.primary,
          border: "none",
          borderRadius: 8,
          color: running ? C.muted : "#fff",
          fontFamily: "'Noto Sans', sans-serif",
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: 2,
          textTransform: "uppercase",
          cursor: running ? "not-allowed" : "pointer",
          marginBottom: 24,
        }}
      >
        {running ? "RUNNING…" : "RUN QUERY"}
      </button>

      {runError && (
        <div style={{
          background: "#1a0508",
          border: `1px solid ${C.danger}`,
          borderRadius: 8,
          padding: 16,
          marginBottom: 20,
          color: C.danger,
          fontSize: 14,
        }}>
          {runError}
        </div>
      )}

      {result && (
        <div style={{ marginBottom: 24 }}>
          <label style={labelBase}>Result</label>
          <div style={{
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: 20,
            fontSize: 15,
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
          }}>
            {result}
          </div>
        </div>
      )}

      {/* RAG Knowledge Base */}
      <Accordion title="RAG Knowledge Base">
        <div style={{ marginBottom: 16 }}>
          {ragChunks.map(chunk => (
            <div
              key={chunk.id}
              style={{
                background: C.panel2,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                padding: 12,
                marginBottom: 8,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: C.primary }}>
                {chunk.title}
              </div>
              <div style={{ fontSize: 13, color: C.mutedText, lineHeight: 1.6 }}>{chunk.content}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
                Updated: {new Date(chunk.updatedAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>

        <label style={{ ...labelBase, marginBottom: 8 }}>Add / Update Knowledge</label>
        <form onSubmit={handleRagSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <textarea
            value={ragInput}
            onChange={e => setRagInput(e.target.value)}
            placeholder="Type Commander knowledge in plain English, e.g. 'Rhystic Study is one of the best draw engines because opponents often forget to pay the 1 mana tax.'"
            rows={3}
            style={{ ...inputBase, fontSize: 14, resize: "vertical" }}
          />
          {ragError && <div style={{ color: C.danger, fontSize: 13 }}>{ragError}</div>}
          <button
            type="submit"
            disabled={ragLoading || !ragInput.trim()}
            style={{
              alignSelf: "flex-end",
              padding: "10px 20px",
              background: ragLoading ? C.panel2 : C.success,
              border: "none",
              borderRadius: 6,
              color: ragLoading ? C.muted : "#061a0e",
              fontFamily: "'Noto Sans', sans-serif",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: 2,
              textTransform: "uppercase",
              cursor: ragLoading ? "not-allowed" : "pointer",
            }}
          >
            {ragLoading ? "TRAINING…" : "TRAIN"}
          </button>
        </form>
      </Accordion>

      {/* System Prompt */}
      <Accordion title="System Prompt">
        <textarea
          value={systemPrompt}
          onChange={e => handleSystemPromptChange(e.target.value)}
          rows={8}
          style={{
            ...inputBase,
            fontFamily: "'Noto Sans', sans-serif",
            fontSize: 13,
            lineHeight: 1.6,
            resize: "vertical",
          }}
        />
        <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
          Changes persist to localStorage automatically.
        </div>
      </Accordion>

      {/* History */}
      <Accordion title={`History (${history.length})`}>
        {history.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 14 }}>No queries run yet.</div>
        ) : (
          history.map((item, i) => (
            <div
              key={i}
              style={{
                background: C.panel2,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                padding: 12,
                marginBottom: 8,
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 6 }}>
                {item.commander && (
                  <span style={{ fontSize: 12, color: C.primary }}>{item.commander}</span>
                )}
                <span style={{ fontSize: 12, color: C.muted }}>Bracket {item.bracket}</span>
                <span style={{ fontSize: 11, color: C.muted, marginLeft: "auto" }}>
                  {new Date(item.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div style={{ fontSize: 13, color: C.mutedText, marginBottom: 6, fontStyle: "italic" }}>
                {item.query}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {item.result}
              </div>
            </div>
          ))
        )}
      </Accordion>
    </div>
  );
}
