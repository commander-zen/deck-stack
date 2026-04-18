import { useState, useEffect } from "react";
import SearchScreen from "./screens/SearchScreen.jsx";
import SwipeScreen  from "./screens/SwipeScreen.jsx";
import PileScreen   from "./screens/PileScreen.jsx";
import SearchSheet  from "./components/SearchSheet.jsx";
import { fetchForSwipe } from "./lib/scryfall.js";

function readSavedPile() {
  try { return JSON.parse(localStorage.getItem("deckstack_pile")) || []; }
  catch { return []; }
}

function readSavedCommander() {
  return localStorage.getItem("deckstack_commander") || null;
}

function readSavedCommanderCard() {
  try { return JSON.parse(localStorage.getItem("deckstack_commander_card")) || null; }
  catch { return null; }
}

function readSavedCards() {
  try { return JSON.parse(localStorage.getItem("deckstack_cards")) || []; }
  catch { return []; }
}

function readSavedMaybeboard() {
  try { return JSON.parse(localStorage.getItem("deckstack_maybeboard")) || []; }
  catch { return []; }
}

export default function App() {
  const [pile,          setPile]          = useState(() => readSavedPile());
  const [commander,     setCommander]     = useState(() => readSavedCommander());
  const [commanderCard, setCommanderCard] = useState(() => readSavedCommanderCard());
  const [maybeboard,    setMaybeboard]    = useState(() => readSavedMaybeboard());
  const [query,         setQuery]         = useState(() => localStorage.getItem("deckstack_query") || "");
  const [swipeCards,    setSwipeCards]    = useState(() => readSavedCards());
  const [swipeMounted,  setSwipeMounted]  = useState(() => readSavedCards().length > 0);
  const [swipeKey,      setSwipeKey]      = useState(0);
  const [screen,        setScreen]        = useState(() => {
    const hasSavedCards = readSavedCards().length > 0;
    const savedScreen   = localStorage.getItem("deckstack_screen");
    if (hasSavedCards) return savedScreen === "pile" ? "pile" : "swipe";
    if (readSavedPile().length > 0 && savedScreen === "pile") return "pile";
    return "search";
  });
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [sheetOpen,     setSheetOpen]     = useState(false);

  // Persistence
  useEffect(() => {
    localStorage.setItem("deckstack_pile", JSON.stringify(pile));
  }, [pile]);

  useEffect(() => {
    if (commander) localStorage.setItem("deckstack_commander", commander);
    else localStorage.removeItem("deckstack_commander");
  }, [commander]);

  useEffect(() => {
    if (commanderCard) localStorage.setItem("deckstack_commander_card", JSON.stringify(commanderCard));
    else localStorage.removeItem("deckstack_commander_card");
  }, [commanderCard]);

  useEffect(() => {
    try {
      localStorage.setItem("deckstack_maybeboard", JSON.stringify(maybeboard));
    } catch {
      // QuotaExceededError — silently skip
    }
  }, [maybeboard]);

  useEffect(() => {
    localStorage.setItem("deckstack_screen", screen);
  }, [screen]);

  useEffect(() => {
    localStorage.setItem("deckstack_query", query);
  }, [query]);

  useEffect(() => {
    try {
      localStorage.setItem("deckstack_cards", JSON.stringify(swipeCards));
    } catch {
      // QuotaExceededError — silently skip
    }
  }, [swipeCards]);

  // Search from SearchScreen (navigates away from session, preserves pile)
  async function handleSearch(q) {
    setLoading(true);
    setError(null);
    try {
      const cards = await fetchForSwipe(q, commanderCard);
      setQuery(q);
      setSwipeCards(cards);
      setSwipeMounted(true);
      setSwipeKey(k => k + 1);
      setScreen("swipe");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Search from the sheet (stays in session, keeps pile intact)
  async function handleSheetSearch(q) {
    setLoading(true);
    setError(null);
    try {
      const cards = await fetchForSwipe(q, commanderCard);
      setQuery(q);
      setSwipeCards(cards);
      setSwipeMounted(true);
      setSwipeKey(k => k + 1);
      setScreen("swipe");
      setSheetOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Clears everything and returns to search (CLEAR PILE)
  function handleClearPile() {
    setPile([]);
    setCommander(null);
    setCommanderCard(null);
    setMaybeboard([]);
    setSwipeCards([]);
    setQuery("");
    setSwipeMounted(false);
    setError(null);
    localStorage.removeItem("deckstack_pile");
    localStorage.removeItem("deckstack_commander");
    localStorage.removeItem("deckstack_commander_card");
    localStorage.removeItem("deckstack_maybeboard");
    localStorage.removeItem("deckstack_screen");
    localStorage.removeItem("deckstack_query");
    localStorage.removeItem("deckstack_cards");
    setScreen("search");
  }

  // Just navigates to search, keeps pile and card queue intact (← SEARCH)
  function handleGoToSearch() {
    setScreen("search");
  }

  function openSheet() {
    setError(null);
    setSheetOpen(true);
  }

  const inSession = screen === "swipe" || screen === "pile";

  return (
    <>
      {screen === "search" && (
        <SearchScreen
          onSearch={handleSearch}
          loading={loading}
          error={error}
          commanderCard={commanderCard}
          onCommanderCardChange={setCommanderCard}
        />
      )}

      {/* Keep SwipeScreen mounted while in a session so idx/history survive tab switches */}
      {swipeMounted && (
        <div style={{ display: screen === "swipe" ? "block" : "none" }}>
          <SwipeScreen
            key={swipeKey}
            cards={swipeCards}
            pile={pile}
            onPileChange={setPile}
            onOpenSearch={openSheet}
            onGoToPile={() => setScreen("pile")}
            commanderCard={commanderCard}
          />
        </div>
      )}

      {screen === "pile" && (
        <PileScreen
          pile={pile}
          onPileChange={setPile}
          onClearPile={handleClearPile}
          onGoToSearch={() => setScreen("swipe")}
          onOpenSearch={openSheet}
          commander={commander}
          onCommanderChange={setCommander}
          commanderCard={commanderCard}
          maybeboard={maybeboard}
          onMaybeboardChange={setMaybeboard}
        />
      )}

      {inSession && swipeMounted && (
        <SearchSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onSearch={handleSheetSearch}
          loading={loading}
          error={error}
        />
      )}
    </>
  );
}
