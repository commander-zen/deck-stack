import { useState, useCallback } from "react";
import LandingScreen         from "./screens/LandingScreen.jsx";
import StrategyScreen        from "./screens/StrategyScreen.jsx";
import CommanderPickerScreen from "./screens/CommanderPickerScreen.jsx";
import ConfirmScreen         from "./screens/ConfirmScreen.jsx";
import LoadingScreen         from "./screens/LoadingScreen.jsx";
import SwipeScreen           from "./screens/SwipeScreen.jsx";
import DoneScreen            from "./screens/DoneScreen.jsx";
import PileScreen            from "./screens/PileScreen.jsx";
import { CATEGORY_ORDER, CATEGORY_META } from "./lib/wrec.js";

// ── Auto-build: fills each category to its WREC target ───────────────────────
function autoBuildDeck(cards) {
  const targets = Object.fromEntries(
    CATEGORY_ORDER.map(cat => [cat, CATEGORY_META[cat].target])
  );
  const groups = {};
  for (const cat of CATEGORY_ORDER) groups[cat] = [];
  for (const card of cards) {
    const cat = card._deckCategory ?? "plan";
    if (groups[cat]) groups[cat].push(card);
    else groups["plan"].push(card);
  }
  const result = [];
  for (const cat of CATEGORY_ORDER) {
    result.push(...groups[cat].slice(0, targets[cat]));
  }
  return result;
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen,    setScreen]    = useState("landing");
  const [commander, setCommander] = useState(null);
  const [swipeState,setSwipeState]= useState(null);
  const [finalPile, setFinalPile] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [easyMode,  setEasyMode]  = useState(false);
  const [themes,    setThemes]    = useState([]);
  const [cardPool,  setCardPool]  = useState([]);
  // skipConfirm: true when entering via the strategy picker (no confirm screen)
  const [skipConfirm, setSkipConfirm] = useState(false);

  // ── Landing ──────────────────────────────────────────────────────────────
  function handleCommanderSelected(card) {
    setCommander(card);
    setLoadError(null);
    setSwipeState(null);
    setSkipConfirm(false);
    setScreen("confirm");
  }

  function handleStrategyFlow() {
    setScreen("strategy");
  }

  // ── Strategy → Commander Picker ──────────────────────────────────────────
  function handleThemesSelected(selectedThemes) {
    setThemes(selectedThemes);
    setScreen("commander-picker");
  }

  // ── Commander Picker → Loading (skip Confirm) ─────────────────────────────
  function handleCommanderPickerSelected(card) {
    setCommander(card);
    setLoadError(null);
    setSwipeState(null);
    setSkipConfirm(true);
    setScreen("loading");
  }

  // ── Confirm → Loading ────────────────────────────────────────────────────
  function handleBuild() {
    setScreen("loading");
  }

  // ── Confirm → back ───────────────────────────────────────────────────────
  function handleChooseAnother() {
    setCommander(null);
    setScreen("landing");
  }

  // ── Loading → Swipe (or auto-build → Pile) ───────────────────────────────
  const handlePoolReady = useCallback((cards) => {
    setCardPool(cards); // cache for Add More Cards
    if (easyMode) {
      const deck = autoBuildDeck(cards);
      setFinalPile(deck);
      setScreen("pile");
    } else {
      setSwipeState({ initialCards: cards });
      setScreen("swipe");
    }
  }, [easyMode]);

  // ── Loading error → back to Confirm ──────────────────────────────────────
  function handleLoadError(msg) {
    setLoadError(msg);
    setScreen(skipConfirm ? "landing" : "confirm");
  }

  // ── Swipe → Done ─────────────────────────────────────────────────────────
  const handleSwipeComplete = useCallback((pile, savedState) => {
    setFinalPile(pile);
    setSwipeState(savedState);
    setScreen("pile");
  }, []);

  // ── Done → Pile ──────────────────────────────────────────────────────────
  function handleViewPile() {
    setScreen("pile");
  }

  // ── Done → Swipe (resume) ────────────────────────────────────────────────
  function handleKeepSwiping() {
    // swipeState already contains { queues, catIdx, pile, history, activeTab }
    setScreen("swipe");
  }

  // ── Pile → Swipe (Add More Cards) ────────────────────────────────────────
  function handleAddMore(currentPile) {
    // Rebuild fresh queues from cached pool but preserve existing pile
    setFinalPile(currentPile);
    setSwipeState({ initialCards: cardPool, pile: currentPile });
    setScreen("swipe");
  }

  // ── Pile → Landing ───────────────────────────────────────────────────────
  function handleNewSearch() {
    setCommander(null);
    setSwipeState(null);
    setFinalPile([]);
    setLoadError(null);
    setCardPool([]);
    setThemes([]);
    setEasyMode(false);
    setSkipConfirm(false);
    setScreen("landing");
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const centered = { display: "flex", flexDirection: "column", minHeight: "100vh" };

  switch (screen) {
    case "landing":
      return (
        <div style={centered}>
          <LandingScreen
            onCommanderSelected={handleCommanderSelected}
            onStrategyFlow={handleStrategyFlow}
          />
        </div>
      );

    case "strategy":
      return (
        <div style={centered}>
          <StrategyScreen
            onNext={handleThemesSelected}
            onBack={() => setScreen("landing")}
          />
        </div>
      );

    case "commander-picker":
      return (
        <div style={centered}>
          <CommanderPickerScreen
            themes={themes}
            onCommanderSelected={handleCommanderPickerSelected}
            onBack={() => setScreen("strategy")}
          />
        </div>
      );

    case "confirm":
      return (
        <div style={centered}>
          <ConfirmScreen
            commander={commander}
            onBuild={handleBuild}
            onBack={handleChooseAnother}
            loadError={loadError}
            easyMode={easyMode}
            onSetEasyMode={setEasyMode}
          />
        </div>
      );

    case "loading":
      return (
        <div style={centered}>
          <LoadingScreen
            commander={commander}
            onReady={handlePoolReady}
            onError={handleLoadError}
          />
        </div>
      );

    case "swipe":
      return (
        <SwipeScreen
          commander={commander}
          swipeState={swipeState}
          onComplete={handleSwipeComplete}
        />
      );

    case "done":
      return (
        <div style={centered}>
          <DoneScreen
            keptCount={finalPile.length}
            onViewPile={handleViewPile}
            onKeepSwiping={handleKeepSwiping}
          />
        </div>
      );

    case "pile":
      return (
        <div style={centered}>
          <PileScreen
            commander={commander}
            pile={finalPile}
            onNewSearch={handleNewSearch}
            onAddMore={cardPool.length > 0 ? handleAddMore : undefined}
          />
        </div>
      );

    default:
      return null;
  }
}
