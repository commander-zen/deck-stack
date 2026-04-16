import { useState, useEffect } from "react";
import SearchScreen from "./screens/SearchScreen.jsx";
import SwipeScreen  from "./screens/SwipeScreen.jsx";
import PileScreen   from "./screens/PileScreen.jsx";
import BottomNav    from "./components/BottomNav.jsx";
import { fetchForSwipe } from "./lib/scryfall.js";

function readSavedPile() {
  try { return JSON.parse(localStorage.getItem("deckstack_pile")) || []; }
  catch { return []; }
}

function readSavedCards() {
  try { return JSON.parse(localStorage.getItem("deckstack_cards")) || []; }
  catch { return []; }
}

export default function App() {
  const [pile,          setPile]          = useState(() => readSavedPile());
  const [query,         setQuery]         = useState(() => localStorage.getItem("deckstack_query") || "");
  const [swipeCards,    setSwipeCards]    = useState(() => readSavedCards());
  const [swipeMounted,  setSwipeMounted]  = useState(() => readSavedCards().length > 0);
  const [screen,        setScreen]        = useState(() => {
    const hasSavedCards = readSavedCards().length > 0;
    const savedScreen   = localStorage.getItem("deckstack_screen");
    if (hasSavedCards) {
      return savedScreen === "pile" ? "pile" : "swipe";
    }
    if (readSavedPile().length > 0 && savedScreen === "pile") return "pile";
    return "search";
  });
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);

  // Persist pile
  useEffect(() => {
    localStorage.setItem("deckstack_pile", JSON.stringify(pile));
  }, [pile]);

  // Persist screen
  useEffect(() => {
    localStorage.setItem("deckstack_screen", screen);
  }, [screen]);

  // Persist query
  useEffect(() => {
    localStorage.setItem("deckstack_query", query);
  }, [query]);

  // Persist cards (may fail with QuotaExceededError — skip silently)
  useEffect(() => {
    try {
      localStorage.setItem("deckstack_cards", JSON.stringify(swipeCards));
    } catch {
      // silently skip if storage is full
    }
  }, [swipeCards]);

  async function handleSearch(q) {
    setLoading(true);
    setError(null);
    try {
      const cards = await fetchForSwipe(q);
      setQuery(q);
      setSwipeCards(cards);
      setSwipeMounted(true);
      setScreen("swipe");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleNewSearch() {
    setPile([]);
    setSwipeCards([]);
    setQuery("");
    setSwipeMounted(false);
    setError(null);
    localStorage.removeItem("deckstack_pile");
    localStorage.removeItem("deckstack_screen");
    localStorage.removeItem("deckstack_query");
    localStorage.removeItem("deckstack_cards");
    setScreen("search");
  }

  const inSession = screen === "swipe" || screen === "pile";

  return (
    <>
      {screen === "search" && (
        <SearchScreen onSearch={handleSearch} loading={loading} error={error} />
      )}

      {/* Keep SwipeScreen mounted while in a session so state (idx, history) survives tab switches */}
      {swipeMounted && (
        <div style={{ display: screen === "swipe" ? "block" : "none" }}>
          <SwipeScreen cards={swipeCards} pile={pile} onPileChange={setPile} />
        </div>
      )}

      {screen === "pile" && (
        <PileScreen pile={pile} onPileChange={setPile} onNewSearch={handleNewSearch} />
      )}

      {/* BottomNav only when there's an active swipe session */}
      {inSession && swipeMounted && (
        <BottomNav screen={screen} pileCount={pile.length} onTab={setScreen} />
      )}
    </>
  );
}
