import { useState, useEffect, useRef } from "react";
import SearchScreen  from "./screens/SearchScreen.jsx";
import SwipeScreen   from "./screens/SwipeScreen.jsx";
import PileScreen    from "./screens/PileScreen.jsx";
import BrewsScreen   from "./screens/BrewsScreen.jsx";
import AuthSheet     from "./components/AuthSheet.jsx";
import BottomNav     from "./components/BottomNav.jsx";
import { fetchFirstPageForSwipe, fetchContinuationPage } from "./lib/scryfall.js";
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
  const [swipeKey,          setSwipeKey]          = useState(0);
  const [swipeDisplayLimit, setSwipeDisplayLimit] = useState(20);
  // screen: "search" | "swipe" | "pile" | "maybe" | "brews"
  const [screen,        setScreen]        = useState("search");
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [authUser,      setAuthUser]      = useState(null);
  const [authSheetOpen, setAuthSheetOpen] = useState(false);

  const bgFetchAbort = useRef(null);

  // Stable refs so closures don't go stale
  const stateRef = useRef({});
  stateRef.current = { pile, commander, commanderCard, maybeboard, swipeCards, swipeIndex, query, activeDeckId, sessionId, authUser };

  // Grow the visible swipe batch as the user approaches the end of the current window
  useEffect(() => {
    if (swipeIndex >= swipeDisplayLimit - 5 && swipeDisplayLimit < swipeCards.length) {
      setSwipeDisplayLimit(l => Math.min(l + 20, swipeCards.length));
    }
  }, [swipeIndex, swipeCards.length, swipeDisplayLimit]);

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
    setSwipeDisplayLimit(Math.min(Math.max(20, si + 20), sc.length || 20));
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
            ? {
                ...d, name,
                pile: s.pile,
                maybeboard: s.maybeboard,
                swipe_cards: s.swipeCards,
                swipe_index: s.swipeIndex,
                commander_instance_id: s.commander,
                commander_card: s.commanderCard,
                last_opened_at: now,
              }
            : d
        ));
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [pile, swipeCards, swipeIndex, commander, commanderCard, maybeboard, query, activeDeckId, sessionId, appReady, authUser]);

  // ── Search ────────────────────────────────────────────────────────────────
  async function handleSearch(q) {
    setLoading(true); setError(null);

    // cancel any in-flight background fetch from a prior search
    bgFetchAbort.current?.abort();
    bgFetchAbort.current = null;

    // Capture commander lock BEFORE any state mutations.
    // Lock applies when the brew has kept cards AND the user has explicitly
    // assigned a pile card as commander (long-press in PileScreen).
    const lockedCard = (pile.length > 0 && commander !== null)
      ? (pile.find(c => c.instanceId === commander) ?? commanderCard)
      : null;
    const effectiveCommanderCard = lockedCard ?? commanderCard;

    try {
      const { cards: firstCards, nextPage } = await fetchFirstPageForSwipe(q, effectiveCommanderCard);

      const deckName = computeDeckName(effectiveCommanderCard, q);

      let targetDeckId = activeDeckId;
      if (!targetDeckId) {
        targetDeckId = crypto.randomUUID();
        const newDeck = {
          id: targetDeckId, name: deckName,
          commander_name: effectiveCommanderCard?.name ?? null,
          commander_instance_id: null,
          commander_card: effectiveCommanderCard ?? null,
          pile: [], maybeboard: [], swipe_cards: firstCards,
          swipe_index: 0, query: q,
          last_opened_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };
        setActiveDeckId(targetDeckId);
        setDecks(ds => [newDeck, ...ds]);
      } else {
        setDecks(ds => ds.map(d =>
          d.id === targetDeckId
            ? { ...d, name: deckName, commander_card: effectiveCommanderCard ?? null, swipe_cards: firstCards, swipe_index: 0, query: q, last_opened_at: new Date().toISOString() }
            : d
        ));
      }

      setPile([]); setCommander(null); setMaybeboard([]);
      setQuery(q); setSwipeCards(firstCards); setSwipeIndex(0); setSwipeDisplayLimit(20);
      // Restore locked commander into state so it survives the pile reset
      if (lockedCard) setCommanderCard(lockedCard);
      setSwipeMounted(true);
      setSwipeKey(k => k + 1);
      setScreen("swipe");
      setLoading(false);

      const deckPayload = {
        id: targetDeckId, name: deckName,
        commander_name: effectiveCommanderCard?.name ?? null,
        commander_instance_id: null,
        commander_card: effectiveCommanderCard ?? null,
        pile: [], maybeboard: [], swipe_cards: firstCards,
        swipe_index: 0, query: q,
        last_opened_at: new Date().toISOString(),
      };
      if (sessionId) saveDeck(sessionId, deckPayload, authUser?.id ?? null).catch(console.error);

      // Background-fetch remaining Scryfall pages (up to 175 total)
      if (nextPage) {
        const ctrl = new AbortController();
        bgFetchAbort.current = ctrl;
        const CAP = 175;
        let url = nextPage;
        let all = [...firstCards];
        while (url && all.length < CAP && !ctrl.signal.aborted) {
          await new Promise(r => setTimeout(r, 100));
          const { cards: more, nextPage: next } = await fetchContinuationPage(url, { signal: ctrl.signal });
          if (ctrl.signal.aborted) break;
          all = [...all, ...more].slice(0, CAP);
          setSwipeCards([...all]);
          url = next && all.length < CAP ? next : null;
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message);
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
    // If the brew already has kept cards AND an explicitly-assigned commander,
    // the commander is immutable — keep the existing one, ignore the import's.
    const commanderLocked = pile.length > 0 && commander !== null;
    const effectiveCommanderCard = commanderLocked ? commanderCard : (importedCommanderCard ?? null);
    const effectiveCommander     = commanderLocked ? commander     : (importedCommanderCard?.instanceId ?? null);

    const deckName = effectiveCommanderCard?.name || importedCommanderCard?.name || "Imported Deck";

    // Shared state updates regardless of path
    setPile(importedPile);
    setCommander(effectiveCommander);
    setCommanderCard(effectiveCommanderCard);
    setSwipeCards([]); setSwipeIndex(0); setMaybeboard([]); setQuery("");
    setSwipeMounted(false);
    setScreen("pile");

    if (activeDeckId) {
      // Load into the current active brew — don't create a second deck
      const deckPayload = {
        id: activeDeckId, name: deckName,
        commander_name: effectiveCommanderCard?.name ?? null,
        commander_instance_id: effectiveCommander,
        commander_card: effectiveCommanderCard ?? null,
        pile: importedPile, maybeboard: [],
        swipe_cards: [], swipe_index: 0, query: "",
        last_opened_at: new Date().toISOString(),
      };
      setDecks(ds => ds.map(d => d.id === activeDeckId ? { ...d, ...deckPayload } : d));
      if (sessionId) saveDeck(sessionId, deckPayload, authUser?.id ?? null).catch(console.error);
    } else {
      // No active brew — create exactly one new deck
      const newDeckId = crypto.randomUUID();
      const newDeck = {
        id: newDeckId, name: deckName,
        commander_name: effectiveCommanderCard?.name ?? null,
        commander_instance_id: effectiveCommander,
        commander_card: effectiveCommanderCard ?? null,
        pile: importedPile, maybeboard: [],
        swipe_cards: [], swipe_index: 0, query: "",
        last_opened_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      setActiveDeckId(newDeckId);
      setDecks(ds => [newDeck, ...ds]);
      if (sessionId) saveDeck(sessionId, newDeck, authUser?.id ?? null).catch(console.error);
    }
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
    await deleteDeck(sessionId, deckId, authUser?.id ?? null);
    const remaining = decks.filter(d => d.id !== deckId);
    setDecks(remaining);
    if (deckId === activeDeckId) {
      if (remaining.length > 0) {
        // Switch directly — avoid handleSwitchDeck which saves the just-deleted deck
        const next = remaining[0];
        setActiveDeckId(next.id);
        restoreDeck(next);
      } else {
        // No decks left — reset to clean search state without saving anything
        setPile([]); setCommander(null); setCommanderCard(null);
        setMaybeboard([]); setSwipeCards([]); setSwipeIndex(0);
        setQuery(""); setSwipeMounted(false); setActiveDeckId(null);
        setScreen("search");
      }
    }
  }

  // ── Search more (from done state) ─────────────────────────────────────────
  function handleSearchMore() {
    setSwipeCards([]);
    setSwipeIndex(0);
    setSwipeMounted(false);
    setScreen("search");
  }

  // ── Nav helpers ───────────────────────────────────────────────────────────
  function goToStack() {
    if (swipeMounted) setScreen("swipe");
    else setScreen("search");
  }

  function goToSearch() { setScreen("search"); }

  function goToPile() { setScreen("pile"); }

  function goToMaybe() { setScreen("maybe"); }

  function goToProfile() { setScreen("brews"); }

  const showNav = true;

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
        />
      )}

      {swipeMounted && (
        <div style={{ display: screen === "swipe" ? "block" : "none" }}>
          <SwipeScreen
            key={swipeKey}
            cards={swipeCards.slice(0, swipeDisplayLimit)}
            pile={pile}
            onPileChange={setPile}
            maybeboard={maybeboard}
            onMaybeboardChange={setMaybeboard}
            onGoToPile={goToPile}
            onGoToSearch={goToSearch}
            onSearchMore={handleSearchMore}
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
          onImport={handleImport}
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
