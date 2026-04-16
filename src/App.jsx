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

export default function App() {
  const [pile,          setPile]          = useState(() => readSavedPile());
  const [screen,        setScreen]        = useState(() => {
    const saved = readSavedPile();
    if (saved.length > 0 && localStorage.getItem("deckstack_screen") === "pile") return "pile";
    return "search";
  });
  const [swipeCards,    setSwipeCards]    = useState([]);
  const [swipeMounted,  setSwipeMounted]  = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);

  // Persist pile and screen
  useEffect(() => {
    localStorage.setItem("deckstack_pile", JSON.stringify(pile));
  }, [pile]);

  useEffect(() => {
    localStorage.setItem("deckstack_screen", screen);
  }, [screen]);

  async function handleSearch(query) {
    setLoading(true);
    setError(null);
    try {
      const cards = await fetchForSwipe(query);
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
    setSwipeMounted(false);
    setError(null);
    localStorage.removeItem("deckstack_pile");
    localStorage.removeItem("deckstack_screen");
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
