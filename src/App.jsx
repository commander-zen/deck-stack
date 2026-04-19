import { useState, useEffect, useRef } from "react";
import SearchScreen  from "./screens/SearchScreen.jsx";
import SwipeScreen   from "./screens/SwipeScreen.jsx";
import PileScreen    from "./screens/PileScreen.jsx";
import BrewsScreen   from "./screens/BrewsScreen.jsx";
import AuthSheet     from "./components/AuthSheet.jsx";
import BottomNav     from "./components/BottomNav.jsx";
import { fetchForSwipe } from "./lib/scryfall.js";
import { getOrCreateSession, loadDecks, saveDeck, deleteDeck, migrateAnonymousDecks } from "./lib/db.js";
import { getSession, onAuthChange } from "./lib/auth.js";

function ensureInstanceIds(cards) {
  return (cards || []).map(c => c.instanceId ? c : { ...c, instanceId: crypto.randomUUID() });
}

function computeDeckName(commanderCard, query) {
  if (commanderCard?.name) return commanderCard.name;
  if (query?.trim()) return query.trim().split(/\s+/)[0];
  return "Untitled Brew";
}

export default function App() {
  const [appReady,     setAppReady]     = useState(false);
  const [sessionId,    setSessionId]    = useState(null);
  const [decks,        setDecks]        = useState([]);
  const [activeDeckId, setActiveDeckId] = useState(null);

  const [pile,          setPile]          = useState([]);
  const [commander,     setCommander]     = useState(null);
  const [commanderCard, setCommanderCard] = useState(null);
  const [maybeboard,    setMaybeboard]    = useState([]);
  const [query,         setQuery]         = useState("");
  const [swipeCards,    setSwipeCards]    = useState([]);
  const [swipeIndex,    setSwipeIndex]    = useState(0);
  const [swipeMounted,  setSwipeMounted]  = useState(false);
  const [swipeKey,      setSwipeKey]      = useState(0);
  // screen: "search" | "swipe" | "pile" | "maybe" | "brews"
  const [screen,        setScreen]        = useState("search");
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [authUser,      setAuthUser]      = useState(null);
  const [authSheetOpen, setAuthSheetOpen] = useState(false);

  // Stable refs so closures don't go stale
  const stateRef = useRef({});
  stateRef.current = { pile, commander, commanderCard, maybeboard, swipeCards, swipeIndex, query, activeDeckId, sessionId, authUser };

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        const sid = await getOrCreateSession();
        setSessionId(sid);
        const session = await getSession();
        const user = session?.user ?? null;
        setAuthUser(user);
        const dbDecks = await loadDecks(sid, user?.id ?? null);
        if (dbDecks.length > 0) {
          setDecks(dbDecks);
          const latest = dbDecks[0];
          setActiveDeckId(latest.id);
          restoreDeck(latest);
        }
      } catch (err) {
        console.error("Failed to init from Supabase:", err);
      } finally {
        setAppReady(true);
      }
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function restoreDeck(deck) {
    const p  = ensureInstanceIds(deck.pile);
    const sc = ensureInstanceIds(deck.swipe_cards);
    const mb = ensureInstanceIds(deck.maybeboard);
    const si = deck.swipe_index ?? 0;
    const cid = deck.commander_instance_id;

    setPile(p);
    setSwipeCards(sc);
    setSwipeIndex(si);
    setMaybeboard(mb);
    setQuery(deck.query || "");
    setCommanderCard(deck.commander_card || null);
    setCommander(cid && p.some(c => c.instanceId === cid) ? cid : null);

    if (sc.length > 0) {
      setSwipeMounted(true);
      setSwipeKey(k => k + 1);
      setScreen("swipe");
    } else if (p.length > 0) {
      setSwipeMounted(false);
      setScreen("pile");
    } else {
      setScreen("search");
    }
  }

  // ── Auth subscription ─────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthChange(async (event, session) => {
      const user = session?.user ?? null;
      const s = stateRef.current;
      if (event === "SIGNED_IN" && user) {
        try {
          await migrateAnonymousDecks(s.sessionId);
          const dbDecks = await loadDecks(s.sessionId, user.id);
          setDecks(dbDecks);
        } catch (err) {
          console.error("Auth migration failed:", err);
        }
      } else if (event === "SIGNED_OUT") {
        try {
          const dbDecks = await loadDecks(s.sessionId, null);
          setDecks(dbDecks);
        } catch (err) {
          console.error("Failed to reload decks after sign-out:", err);
        }
      }
      setAuthUser(user);
    });
    return unsubscribe;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Debounced auto-save ───────────────────────────────────────────────────
  useEffect(() => {
    if (!appReady || !sessionId || !activeDeckId) return;
    const s = stateRef.current;
    const timer = setTimeout(async () => {
      const name = computeDeckName(s.commanderCard, s.query);
      try {
        await saveDeck(sessionId, {
          id: s.activeDeckId, name,
          commander_name: s.commanderCard?.name ?? null,
          commander_instance_id: s.commander ?? null,
          commander_card: s.commanderCard ?? null,
          pile: s.pile, maybeboard: s.maybeboard,
          swipe_cards: s.swipeCards, swipe_index: s.swipeIndex, query: s.query,
        }, s.authUser?.id ?? null);
        const now = new Date().toISOString();
        setDecks(ds => ds.map(d =>
          d.id === s.activeDeckId
            ? { ...d, name, pile: s.pile, last_opened_at: now }
            : d
        ));
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [pile, swipeCards, swipeIndex, commander, commanderCard, maybeboard, query, activeDeckId, sessionId, appReady, authUser]);

  // ── Search: new deck ──────────────────────────────────────────────────────
  async function handleSearch(q) {
    setLoading(true); setError(null);
    try {
      const cards = await fetchForSwipe(q, commanderCard);

      // flush current deck
      if (sessionId && activeDeckId) {
        const s = stateRef.current;
        saveDeck(sessionId, {
          id: s.activeDeckId,
          name: computeDeckName(s.commanderCard, s.query),
          commander_name: s.commanderCard?.name ?? null,
          commander_instance_id: s.commander ?? null,
          commander_card: s.commanderCard ?? null,
          pile: s.pile, maybeboard: s.maybeboard,
          swipe_cards: s.swipeCards, swipe_index: s.swipeIndex, query: s.query,
        }, s.authUser?.id ?? null).catch(console.error);
      }

      const newDeckId = crypto.randomUUID();
      const deckName  = computeDeckName(commanderCard, q);
      const newDeck   = {
        id: newDeckId, name: deckName,
        commander_name: commanderCard?.name ?? null,
        commander_instance_id: null,
        commander_card: commanderCard ?? null,
        pile: [], maybeboard: [], swipe_cards: cards,
        swipe_index: 0, query: q,
        last_opened_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      setPile([]); setCommander(null); setMaybeboard([]);
      setQuery(q); setSwipeCards(cards); setSwipeIndex(0);
      setActiveDeckId(newDeckId);
      setDecks(ds => [newDeck, ...ds]);
      setSwipeMounted(true);
      setSwipeKey(k => k + 1);
      setScreen("swipe");

      if (sessionId) saveDeck(sessionId, newDeck, authUser?.id ?? null).catch(console.error);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Clear pile ────────────────────────────────────────────────────────────
  async function handleClearPile() {
    if (sessionId && activeDeckId) {
      deleteDeck(sessionId, activeDeckId, authUser?.id ?? null).catch(console.error);
      setDecks(ds => ds.filter(d => d.id !== activeDeckId));
    }
    setPile([]); setCommander(null); setCommanderCard(null);
    setMaybeboard([]); setSwipeCards([]); setSwipeIndex(0);
    setQuery(""); setSwipeMounted(false); setActiveDeckId(null);
    setError(null); setScreen("search");
  }

  // ── Import deck ───────────────────────────────────────────────────────────
  async function handleImport(importedPile, importedCommanderCard) {
    const newDeckId = crypto.randomUUID();
    const deckName  = importedCommanderCard?.name || "Imported Deck";
    const newDeck   = {
      id: newDeckId, name: deckName,
      commander_name: importedCommanderCard?.name ?? null,
      commander_instance_id: importedCommanderCard?.instanceId ?? null,
      commander_card: importedCommanderCard ?? null,
      pile: importedPile, maybeboard: [],
      swipe_cards: [], swipe_index: 0, query: "",
      last_opened_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    setPile(importedPile);
    setCommander(importedCommanderCard?.instanceId ?? null);
    setCommanderCard(importedCommanderCard ?? null);
    setSwipeCards([]); setSwipeIndex(0); setMaybeboard([]);
    setActiveDeckId(newDeckId);
    setDecks(ds => [newDeck, ...ds]);
    setScreen("pile");

    if (sessionId) saveDeck(sessionId, newDeck, authUser?.id ?? null).catch(console.error);
  }

  // ── Switch deck ───────────────────────────────────────────────────────────
  function handleSwitchDeck(deckId) {
    const deck = decks.find(d => d.id === deckId);
    if (!deck) return;

    if (sessionId && activeDeckId) {
      const s = stateRef.current;
      saveDeck(sessionId, {
        id: s.activeDeckId,
        name: computeDeckName(s.commanderCard, s.query),
        commander_name: s.commanderCard?.name ?? null,
        commander_instance_id: s.commander ?? null,
        commander_card: s.commanderCard ?? null,
        pile: s.pile, maybeboard: s.maybeboard,
        swipe_cards: s.swipeCards, swipe_index: s.swipeIndex, query: s.query,
      }, s.authUser?.id ?? null).catch(console.error);
    }

    setActiveDeckId(deckId);
    const now = new Date().toISOString();
    setDecks(ds =>
      ds.map(d => d.id === deckId ? { ...d, last_opened_at: now } : d)
        .sort((a, b) => new Date(b.last_opened_at) - new Date(a.last_opened_at))
    );
    restoreDeck(deck);
  }

  // ── New brew ──────────────────────────────────────────────────────────────
  function handleNewDeck() {
    if (sessionId && activeDeckId) {
      const s = stateRef.current;
      saveDeck(sessionId, {
        id: s.activeDeckId,
        name: computeDeckName(s.commanderCard, s.query),
        commander_name: s.commanderCard?.name ?? null,
        commander_instance_id: s.commander ?? null,
        commander_card: s.commanderCard ?? null,
        pile: s.pile, maybeboard: s.maybeboard,
        swipe_cards: s.swipeCards, swipe_index: s.swipeIndex, query: s.query,
      }, s.authUser?.id ?? null).catch(console.error);
    }
    setPile([]); setCommander(null); setCommanderCard(null);
    setMaybeboard([]); setSwipeCards([]); setSwipeIndex(0);
    setQuery(""); setSwipeMounted(false); setActiveDeckId(null);
    setScreen("search");
  }

  // ── Delete deck ───────────────────────────────────────────────────────────
  async function handleDeleteDeck(deckId) {
    try {
      await deleteDeck(sessionId, deckId, authUser?.id ?? null);
      const remaining = decks.filter(d => d.id !== deckId);
      setDecks(remaining);
      if (deckId === activeDeckId) {
        if (remaining.length > 0) {
          handleSwitchDeck(remaining[0].id);
        } else {
          handleNewDeck();
        }
      }
    } catch (err) {
      console.error("Failed to delete deck:", err);
    }
  }

  // ── Nav helpers ───────────────────────────────────────────────────────────
  function goToStack() {
    if (swipeMounted) setScreen("swipe");
    else setScreen("search");
  }

  function goToPile() { setScreen("pile"); }

  function goToMaybe() { setScreen("maybe"); }

  function goToProfile() { setScreen("brews"); }

  // Show nav whenever there is an active deck (even on search screen mid-session)
  const showNav = activeDeckId !== null || swipeMounted || pile.length > 0 || decks.length > 0;

  if (!appReady) {
    return (
      <div style={{
        minHeight: "100dvh", background: "var(--bg)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 18, letterSpacing: 4, color: "var(--muted)",
        }}>
          LOADING…
        </span>
      </div>
    );
  }

  return (
    <>
      {/* ── Screens ── */}

      {screen === "search" && (
        <SearchScreen
          onSearch={handleSearch}
          loading={loading}
          error={error}
          commanderCard={commanderCard}
          onCommanderCardChange={setCommanderCard}
          onImport={handleImport}
        />
      )}

      {swipeMounted && (
        <div style={{ display: screen === "swipe" ? "block" : "none" }}>
          <SwipeScreen
            key={swipeKey}
            cards={swipeCards}
            pile={pile}
            onPileChange={setPile}
            onGoToPile={goToPile}
            commanderCard={commanderCard}
            onCommanderCardChange={setCommanderCard}
            initialIndex={swipeIndex}
            onIndexChange={setSwipeIndex}
          />
        </div>
      )}

      {(screen === "pile" || screen === "maybe") && (
        <PileScreen
          pile={pile}
          onPileChange={setPile}
          onClearPile={handleClearPile}
          commander={commander}
          onCommanderChange={setCommander}
          commanderCard={commanderCard}
          maybeboard={maybeboard}
          onMaybeboardChange={setMaybeboard}
          initialTab={screen === "maybe" ? "maybe" : "deck"}
        />
      )}

      {screen === "brews" && (
        <BrewsScreen
          decks={decks}
          activeDeckId={activeDeckId}
          onSwitch={id => { handleSwitchDeck(id); }}
          onNew={() => { handleNewDeck(); }}
          onDelete={handleDeleteDeck}
          authUser={authUser}
          onOpenAuth={() => setAuthSheetOpen(true)}
        />
      )}

      {/* ── Bottom nav ── */}
      {showNav && (
        <BottomNav
          screen={screen}
          onGoToStack={goToStack}
          onGoToPile={goToPile}
          onGoToMaybe={goToMaybe}
          onGoToProfile={goToProfile}
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
