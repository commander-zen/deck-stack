import { useState, useCallback } from "react";
import LandingScreen  from "./screens/LandingScreen.jsx";
import ConfirmScreen  from "./screens/ConfirmScreen.jsx";
import LoadingScreen  from "./screens/LoadingScreen.jsx";
import SwipeScreen    from "./screens/SwipeScreen.jsx";
import DoneScreen     from "./screens/DoneScreen.jsx";
import PileScreen     from "./screens/PileScreen.jsx";

// ── App ───────────────────────────────────────────────────────────────────────
// Screen flow: landing → confirm → loading → swipe → done → pile
//
// Resuming swipe from the done screen is supported by storing swipeState
// (the full { cards, index, pile, history } snapshot) in App state.

export default function App() {
  const [screen,     setScreen]     = useState("landing");
  const [commander,  setCommander]  = useState(null);
  const [swipeState, setSwipeState] = useState(null); // resume data for swipe screen
  const [finalPile,  setFinalPile]  = useState([]);   // pile passed to pile screen
  const [loadError,  setLoadError]  = useState(null);

  // ── Landing → Confirm ────────────────────────────────────────────────────
  function handleCommanderSelected(card) {
    setCommander(card);
    setLoadError(null);
    setSwipeState(null);
    setScreen("confirm");
  }

  // ── Confirm → Loading ────────────────────────────────────────────────────
  function handleBuild() {
    setScreen("loading");
  }

  // ── Confirm → Landing ────────────────────────────────────────────────────
  function handleChooseAnother() {
    setCommander(null);
    setScreen("landing");
  }

  // ── Loading → Swipe ──────────────────────────────────────────────────────
  const handlePoolReady = useCallback((cards) => {
    setSwipeState({ initialCards: cards });
    setScreen("swipe");
  }, []);

  // ── Loading error → back to Confirm ──────────────────────────────────────
  function handleLoadError(msg) {
    setLoadError(msg);
    setScreen("confirm");
  }

  // ── Swipe → Done ─────────────────────────────────────────────────────────
  const handleSwipeComplete = useCallback((pile, savedState) => {
    setFinalPile(pile);
    setSwipeState(savedState); // save so user can resume
    setScreen("done");
  }, []);

  // ── Done → Pile ──────────────────────────────────────────────────────────
  function handleViewPile() {
    setScreen("pile");
  }

  // ── Done → Swipe (resume) ────────────────────────────────────────────────
  function handleKeepSwiping() {
    // swipeState already has { cards, index, pile, history }
    setScreen("swipe");
  }

  // ── Pile → Landing ───────────────────────────────────────────────────────
  function handleNewSearch() {
    setCommander(null);
    setSwipeState(null);
    setFinalPile([]);
    setLoadError(null);
    setScreen("landing");
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const centered = { display: "flex", flexDirection: "column", minHeight: "100vh" };

  switch (screen) {
    case "landing":
      return (
        <div style={centered}>
          <LandingScreen onCommanderSelected={handleCommanderSelected} />
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
          initialCards={swipeState?.initialCards ?? swipeState?.cards ?? []}
          resumeState={
            // If swipeState has an index (i.e., user is resuming), pass the full state.
            // If it only has initialCards (fresh start), pass nothing.
            swipeState?.index != null ? swipeState : undefined
          }
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
          />
        </div>
      );

    default:
      return null;
  }
}
