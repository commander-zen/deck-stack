import { useState } from "react";
import SearchScreen from "./pages/SearchScreen.jsx";
import SwipeScreen  from "./pages/SwipeScreen.jsx";
import PileScreen   from "./pages/PileScreen.jsx";

// screen: "search" | "swipe" | "pile"
export default function App() {
  const [screen, setScreen] = useState("search");
  const [cards,  setCards]  = useState([]);   // full fetched card list
  const [pile,   setPile]   = useState([]);   // kept cards

  function handleCardsReady(cardList) {
    setCards(cardList);
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
    setScreen("search");
  }

  if (screen === "swipe") {
    return <SwipeScreen cards={cards} onDone={handleSwipeDone} onBack={handleNewSearch} />;
  }
  if (screen === "pile") {
    return <PileScreen pile={pile} onNewSearch={handleNewSearch} />;
  }
  return <SearchScreen onCardsReady={handleCardsReady} />;
}
