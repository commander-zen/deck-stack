import { useState } from "react";
import SearchScreen from "./screens/SearchScreen.jsx";
import SwipeScreen  from "./screens/SwipeScreen.jsx";
import PileScreen   from "./screens/PileScreen.jsx";
import { fetchForSwipe } from "./lib/scryfall.js";

export default function App() {
  const [screen,     setScreen]     = useState("search");
  const [swipeCards, setSwipeCards] = useState([]);
  const [pile,       setPile]       = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);

  async function handleSearch(query) {
    setLoading(true);
    setError(null);
    try {
      const cards = await fetchForSwipe(query);
      setSwipeCards(cards);
      setScreen("swipe");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSwipeComplete(finalPile) {
    setPile(finalPile);
    setScreen("pile");
  }

  function handleNewSearch() {
    setSwipeCards([]);
    setPile([]);
    setError(null);
    setScreen("search");
  }

  switch (screen) {
    case "search":
      return <SearchScreen onSearch={handleSearch} loading={loading} error={error} />;

    case "swipe":
      return (
        <SwipeScreen
          cards={swipeCards}
          onComplete={handleSwipeComplete}
        />
      );

    case "pile":
      return (
        <PileScreen
          pile={pile}
          onNewSearch={handleNewSearch}
        />
      );

    default:
      return null;
  }
}
