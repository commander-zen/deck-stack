import { useState, useEffect, useRef } from "react";
import { initAuth } from "./lib/supabase.js";
import BrewShelfScreen from "./screens/BrewShelfScreen.jsx";
import DeckDetailScreen from "./screens/DeckDetailScreen.jsx";
import AuthSheet from "./components/AuthSheet.jsx";
import { getOrCreateSession, loadDecks, saveDeck, deleteDeck, migrateAnonymousDecks, updateDeckStatus } from "./lib/db.js";
import { onAuthChange } from "./lib/auth.js";

function readLocalDecks() {
  try { return JSON.parse(localStorage.getItem("deckstack_decks") ?? "[]"); }
  catch { return []; }
}

export default function App() {
  const [appReady,      setAppReady]      = useState(false);
  const [sessionId,     setSessionId]     = useState(null);
  const [decks,         setDecks]         = useState(readLocalDecks);
  const [activeDeckId,  setActiveDeckId]  = useState(null);
  const [selectedDeckId, setSelectedDeckId] = useState(null);
  const [screen,        setScreen]        = useState("brews"); // "brews" | "deck-detail"
  const [authUser,      setAuthUser]      = useState(null);
  const [authSheetOpen, setAuthSheetOpen] = useState(false);

  const initFetchedRef = useRef(false);
  const stateRef = useRef({});
  stateRef.current = { sessionId, authUser, decks, activeDeckId };

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const safetyTimer = setTimeout(() => setAppReady(true), 5000);

    async function initBackground() {
      initFetchedRef.current = true;

      const localDecks = readLocalDecks();
      if (localDecks.length > 0) {
        setActiveDeckId(localDecks[0].id);
        clearTimeout(safetyTimer);
        setAppReady(true);
      }

      try {
        const sid = await getOrCreateSession();
        setSessionId(sid);
        const session = await initAuth();
        const user = session?.user ?? null;
        setAuthUser(user);
        const dbDecks = await loadDecks(sid, user?.id ?? null);
        if (dbDecks.length > 0) {
          setDecks(dbDecks);
          setActiveDeckId(dbDecks[0].id);
        }
      } catch (err) {
        console.error("Failed to init from Supabase:", err);
      } finally {
        clearTimeout(safetyTimer);
        setAppReady(true);
      }
    }
    initBackground();
    return () => clearTimeout(safetyTimer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auth subscription ─────────────────────────────────────────────────────
  useEffect(() => {
    const subscription = onAuthChange(async (event, session) => {
      const user = session?.user ?? null;
      const s = stateRef.current;

      if (event === "INITIAL_SESSION" && user) {
        setAuthUser(user);
        if (initFetchedRef.current) return;
        try {
          const dbDecks = await loadDecks(s.sessionId, user.id);
          if (dbDecks.length > 0 && stateRef.current.decks.length === 0) {
            setDecks(dbDecks);
            setActiveDeckId(dbDecks[0].id);
          }
        } catch (err) {
          console.error("Session restore failed:", err);
        }
      } else if (event === "SIGNED_IN" && user) {
        setAuthUser(user);
        try {
          await migrateAnonymousDecks(s.sessionId);
          const dbDecks = await loadDecks(s.sessionId, user.id);
          setDecks(dbDecks);
        } catch (err) {
          console.error("Auth migration failed:", err);
        }
      } else if (event === "SIGNED_OUT") {
        setAuthUser(null);
        try {
          const dbDecks = await loadDecks(s.sessionId, null);
          setDecks(dbDecks);
        } catch (err) {
          console.error("Failed to reload decks after sign-out:", err);
        }
      } else {
        setAuthUser(user);
      }
    });
    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mirror decks to localStorage ─────────────────────────────────────────
  useEffect(() => {
    if (!appReady) return;
    try { localStorage.setItem("deckstack_decks", JSON.stringify(decks)); }
    catch (err) { console.warn("localStorage decks write failed:", err); }
  }, [decks, appReady]);

  // ── Deck management ───────────────────────────────────────────────────────
  function handleNewDeck() {
    const newDeckId = crypto.randomUUID();
    const newDeck = {
      id: newDeckId, name: "New Brew",
      commander_name: null, commander_instance_id: null, commander_card: null,
      pile: [], maybeboard: [], swipe_cards: [], swipe_index: 0, query: "",
      last_opened_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    setActiveDeckId(newDeckId);
    setDecks(ds => [newDeck, ...ds]);
    const s = stateRef.current;
    if (s.sessionId) {
      saveDeck(s.sessionId, newDeck, s.authUser?.id ?? null).catch(err => {
        console.error("Failed to save new brew:", err);
      });
    }
  }

  function handleSwitchDeck(deckId) {
    setActiveDeckId(deckId);
    const now = new Date().toISOString();
    setDecks(ds =>
      ds.map(d => d.id === deckId ? { ...d, last_opened_at: now } : d)
        .sort((a, b) => new Date(b.last_opened_at) - new Date(a.last_opened_at))
    );
  }

  async function handleDeleteDeck(deckId) {
    await deleteDeck(sessionId, deckId, authUser?.id ?? null);
    const remaining = decks.filter(d => d.id !== deckId);
    setDecks(remaining);
    if (deckId === activeDeckId) {
      setActiveDeckId(remaining.length > 0 ? remaining[0].id : null);
    }
  }

  function handleUpdateDeckStatus(deckId, newStatus) {
    setDecks(ds => ds.map(d => d.id === deckId ? { ...d, status: newStatus } : d));
    const s = stateRef.current;
    updateDeckStatus(deckId, newStatus, s.sessionId, s.authUser?.id ?? null)
      .catch(err => console.error("Failed to update deck status:", err));
  }

  // ── Loading splash ────────────────────────────────────────────────────────
  if (!appReady) {
    return (
      <div style={{
        minHeight: "100dvh", background: "var(--bg)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 18, letterSpacing: 4, color: "var(--muted)",
        }}>
          LOADING…
        </span>
      </div>
    );
  }

  return (
    <>
      {screen !== "deck-detail" && screen !== "settings" && (
        <BrewShelfScreen
          decks={decks}
          activeDeckId={activeDeckId}
          onSelectDeck={id => { setSelectedDeckId(id); setScreen("deck-detail"); }}
          onNewBrew={handleNewDeck}
          authUser={authUser}
        />
      )}

      {screen === "deck-detail" && (
        <DeckDetailScreen
          deck={decks.find(d => d.id === selectedDeckId)}
          onBack={() => setScreen("brews")}
        />
      )}

      <AuthSheet
        open={authSheetOpen}
        onClose={() => setAuthSheetOpen(false)}
        user={authUser}
      />
    </>
  );
}
