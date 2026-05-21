import { useState, useEffect, useRef } from "react";
import { initAuth } from "./lib/supabase.js";
import NLPTestbed from "./pages/NLPTestbed.jsx";
import BrewShelfScreen from "./screens/BrewShelfScreen.jsx";
import DeckDetailScreen from "./screens/DeckDetailScreen.jsx";
import AuthSheet from "./components/AuthSheet.jsx";
import { getOrCreateSession, loadDecks, saveDeck, deleteDeck, migrateAnonymousDecks } from "./lib/db.js";
import { onAuthChange } from "./lib/auth.js";

function readLocalDecks() {
  try { return JSON.parse(localStorage.getItem("deckstack_decks") ?? "[]"); }
  catch { return []; }
}

export default function App() {
  const [appReady,      setAppReady]      = useState(false);
  const [sessionId,     setSessionId]     = useState(null);
  const [decks,         setDecks]         = useState(readLocalDecks);
  const [activeScreen,  setActiveScreen]  = useState("shelf"); // "shelf" | "detail"
  const [activeDeck,    setActiveDeck]    = useState(null);
  const [authUser,      setAuthUser]      = useState(null);
  const [authSheetOpen, setAuthSheetOpen] = useState(false);

  const initFetchedRef = useRef(false);
  const stateRef = useRef({});
  stateRef.current = { sessionId, authUser };

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const safetyTimer = setTimeout(() => setAppReady(true), 5000);

    async function initBackground() {
      initFetchedRef.current = true;

      const localDecks = readLocalDecks();
      if (localDecks.length > 0) {
        setDecks(localDecks);
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
        if (dbDecks.length > 0) setDecks(dbDecks);
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
          if (dbDecks.length > 0) setDecks(dbDecks);
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

  // ── Navigation ────────────────────────────────────────────────────────────
  function handleDeckSelect(deck) {
    setActiveDeck(deck);
    setActiveScreen("detail");
  }

  function handleBack() {
    setActiveDeck(null);
    setActiveScreen("shelf");
  }

  // ── Deck CRUD ─────────────────────────────────────────────────────────────
  function handleNewDeck() {
    const newDeckId = crypto.randomUUID();
    const newDeck = {
      id: newDeckId, name: "New Brew",
      commander_name: null, commander_instance_id: null, commander_card: null,
      pile: [], maybeboard: [], swipe_cards: [], swipe_index: 0, query: "",
      last_opened_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    setDecks(ds => [newDeck, ...ds]);
    setActiveDeck(newDeck);
    setActiveScreen("detail");
    const s = stateRef.current;
    if (s.sessionId) {
      saveDeck(s.sessionId, newDeck, s.authUser?.id ?? null).catch(err => {
        console.error("Failed to save new brew:", err);
      });
    }
  }

  async function handleDeleteDeck(deckId) {
    const s = stateRef.current;
    await deleteDeck(s.sessionId, deckId, s.authUser?.id ?? null);
    setDecks(ds => ds.filter(d => d.id !== deckId));
    if (activeDeck?.id === deckId) setActiveDeck(null);
  }

  function handleUpdateDeck(updatedDeck) {
    setDecks(ds => ds.map(d => d.id === updatedDeck.id ? updatedDeck : d));
    setActiveDeck(updatedDeck);
    const s = stateRef.current;
    if (s.sessionId) {
      saveDeck(s.sessionId, updatedDeck, s.authUser?.id ?? null).catch(err => {
        console.error("Failed to save deck:", err);
      });
    }
  }

  // ── NLP Testbed route ─────────────────────────────────────────────────────
  if (window.location.pathname === "/nlp-testbed") {
    return <NLPTestbed />;
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
      {activeScreen === "shelf" && (
        <BrewShelfScreen
          decks={decks}
          onSelectDeck={id => handleDeckSelect(decks.find(d => d.id === id))}
          onNewBrew={handleNewDeck}
          onDeleteDeck={handleDeleteDeck}
        />
      )}

      {activeScreen === "detail" && (
        <DeckDetailScreen
          deck={activeDeck}
          onBack={handleBack}
          onUpdateDeck={handleUpdateDeck}
          onDeleteDeck={handleDeleteDeck}
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
