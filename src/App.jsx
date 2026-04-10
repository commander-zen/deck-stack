import { useState } from "react";
import { fetchAllCards } from "./lib/scryfall.js";
import SearchScreen from "./pages/SearchScreen.jsx";
import SwipeScreen  from "./pages/SwipeScreen.jsx";
import PileScreen   from "./pages/PileScreen.jsx";

const LOAD_MORE_CAP = 500;

// screen: "search" | "swipe" | "pile"
export default function App() {
  const [screen,       setScreen]       = useState("search");
  const [cards,        setCards]        = useState([]);   // full fetched card list
  const [pile,         setPile]         = useState([]);   // kept cards
  const [currentQuery, setCurrentQuery] = useState("");

  function handleCardsReady(cardList, query) {
    setCards(cardList);
    setCurrentQuery(query);
    setPile([]);
    setScreen("swipe");
  }

  function handleSwipeDone(keptCards) {
    setPile(keptCards);
    setScreen("pile");
  }

  function handleNewSearch() {
    setCards([]);
    setPile([]);
    setCurrentQuery("");
    setScreen("search");
  }

  async function handleLoadMore(callback) {
    if (!currentQuery) return;
    const ctrl = new AbortController();
    const collected = [];
    try {
      await fetchAllCards(
        currentQuery,
        ({ partial, finished }) => {
          if (partial) {
            collected.length = 0;
            collected.push(...partial);
          }
          if (!finished && collected.length >= cards.length + LOAD_MORE_CAP) {
            ctrl.abort();
          }
        },
        { signal: ctrl.signal },
      );
    } catch (err) {
      if (err.name !== "AbortError") return;
    }
    const moreCards = collected.slice(cards.length, cards.length + LOAD_MORE_CAP);
    if (moreCards.length > 0) callback(moreCards);
  }

  if (screen === "swipe") {
    return (
      <SwipeScreen
        initialCards={cards}
        onDone={handleSwipeDone}
        onBack={handleNewSearch}
        onLoadMore={handleLoadMore}
      />
    );
  }
  if (screen === "pile") {
    return <PileScreen pile={pile} onNewSearch={handleNewSearch} />;
  }
  return <SearchScreen onCardsReady={handleCardsReady} />;
}
