import { useState, useEffect, useRef } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { initSession } from "./lib/supabase.js";
import SearchScreen  from "./screens/SearchScreen.jsx";
import SwipeScreen   from "./screens/SwipeScreen.jsx";
import PileScreen    from "./screens/PileScreen.jsx";
import TagsScreen    from "./screens/TagsScreen.jsx";
import BrewsScreen   from "./screens/BrewsScreen.jsx";
import WrecTagPicker from "./components/WrecTagPicker.jsx";
import { autoDetectCategory } from "./constants/wrec.js";
import AuthSheet     from "./components/AuthSheet.jsx";
import BottomNav, { NAV_HEIGHT } from "./components/BottomNav.jsx";
import { fetchFirstPageForSwipe, fetchContinuationPage } from "./lib/scryfall.js";
import { getOrCreateSession, loadDecks, saveDeck, deleteDeck, migrateAnonymousDecks } from "./lib/db.js";
import { getSession, onAuthChange } from "./lib/auth.js";

function readLocalDecks() {
  try { return JSON.parse(localStorage.getItem("deckstack_decks") ?? "[]"); }
  catch { return []; }
}

function readLocalSession() {
  try { return JSON.parse(sessionStorage.getItem("deckstack_session") ?? "null"); }
  catch { return null; }
}

function ensureInstanceIds(cards) {
  return (cards || []).map(c => c.instanceId ? c : { ...c, instanceId: crypto.randomUUID() });
}

const isBasicLand = c => Boolean(c?.type_line?.includes("Basic Land"));
const isAnyNumber = c => Boolean(c?.oracle_text?.includes("A deck can have any number of cards named"));
const isStackable = c => isBasicLand(c) || isAnyNumber(c);

function computeDeckName(commanderCard, query) {
  if (commanderCard?.name) return commanderCard.name;
  if (query?.trim()) return query.trim().split(/\s+/)[0];
  return "Untitled Brew";
}

export default function App() {
  const [appReady,     setAppReady]     = useState(false);
  const [sessionId,    setSessionId]    = useState(null);
  const [decks,        setDecks]        = useState(readLocalDecks);
  const [activeDeckId, setActiveDeckId] = useState(null);

  const [pile,          setPile]          = useState([]);
  const [commander,     setCommander]     = useState(null);
  const [commanderCard, setCommanderCard] = useState(null);
  const [maybeboard,    setMaybeboard]    = useState([]);
  const [wrecTags,       setWrecTags]       = useState({});
  const [autoTagged,     setAutoTagged]     = useState(new Set());
  const [pendingTagCard, setPendingTagCard] = useState(null);
  const [query,         setQuery]         = useState("");
  const [swipeCards,    setSwipeCards]    = useState([]);
  const [swipeIndex,    setSwipeIndex]    = useState(0);
  const [swipeMounted,  setSwipeMounted]  = useState(false);
  const [swipeKey,          setSwipeKey]          = useState(0);
  const [swipeDisplayLimit, setSwipeDisplayLimit] = useState(20);
  const [swipeOrder,    setSwipeOrder]    = useState("name");
  const [swipeDir,      setSwipeDir]      = useState("desc");
  // screen: "search" | "swipe" | "pile" | "maybe" | "tags" | "brews"
  const [screen,        setScreen]        = useState("search");
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [authUser,      setAuthUser]      = useState(null);
  const [authSheetOpen, setAuthSheetOpen] = useState(false);
  const [toastMsg,      setToastMsg]      = useState(null);

  const bgFetchAbort   = useRef(null);
  const toastTimer     = useRef(null);
  const initFetchedRef = useRef(false);

  // Stable refs so closures don't go stale
  const stateRef = useRef({});
  stateRef.current = { pile, commander, commanderCard, maybeboard, swipeCards, swipeIndex, query, activeDeckId, sessionId, authUser, decks, wrecTags };

  // Grow the visible swipe batch as the user approaches the end of the current window
  useEffect(() => {
    if (swipeIndex >= swipeDisplayLimit - 5 && swipeDisplayLimit < swipeCards.length) {
      setSwipeDisplayLimit(l => Math.min(l + 20, swipeCards.length));
    }
  }, [swipeIndex, swipeCards.length, swipeDisplayLimit]);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Absolute backstop: unblock after 5 s if Supabase hangs.
    const safetyTimer = setTimeout(() => setAppReady(true), 5000);

    async function initBackground() {
      initFetchedRef.current = true; // prevent INITIAL_SESSION handler from duplicating this fetch

      // ── Fast-path 1: active session in sessionStorage ─────────────────────
      // survives F5 refresh; cleared automatically on tab/window close.
      const localSession = readLocalSession();
      if (localSession) {
        if (localSession.id) setActiveDeckId(localSession.id);
        restoreDeck(localSession);
        clearTimeout(safetyTimer);
        setAppReady(true);
      }

      // ── Fast-path 2: deck list from localStorage ──────────────────────────
      // renders the brews list and last-opened deck instantly on return visits.
      if (!localSession) {
        const localDecks = readLocalDecks(); // same data as decks lazy-init
        if (localDecks.length > 0) {
          setActiveDeckId(localDecks[0].id);
          restoreDeck(localDecks[0]);
          clearTimeout(safetyTimer);
          setAppReady(true);
        }
      }

      // ── Background: Supabase sync ─────────────────────────────────────────
      // Always runs; updates decks list and mirrors it to localStorage.
      // Only re-restores the active deck when no local session was available.
      try {
        const sid = await getOrCreateSession();
        setSessionId(sid);
        const session = await getSession();
        const user = session?.user ?? null;
        setAuthUser(user);
        const dbDecks = await loadDecks(sid, user?.id ?? null);
        if (dbDecks.length > 0) {
          setDecks(dbDecks);
          if (!localSession) {
            setActiveDeckId(dbDecks[0].id);
            restoreDeck(dbDecks[0]);
          }
        }
      } catch (err) {
        console.error("Failed to init from Supabase:", err);
      } finally {
        clearTimeout(safetyTimer);
        setAppReady(true);
      }
    }
    initBackground();
    return () => clearTimeout(safetyTimer);
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
    setWrecTags(deck.tags ?? {});
    setAutoTagged(new Set()); // loaded tags are user-confirmed; start fresh

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

      if (event === "INITIAL_SESSION" && user) {
        // Supabase v2 fires INITIAL_SESSION on hard refresh when a stored session
        // exists. initBackground() is the primary fetch path and always runs on
        // mount — only fall back here if it didn't reach loadDecks (e.g. crashed).
        setAuthUser(user);
        if (initFetchedRef.current) return;
        try {
          const dbDecks = await loadDecks(s.sessionId, user.id);
          if (dbDecks.length > 0 && stateRef.current.decks.length === 0) {
            setDecks(dbDecks);
            restoreDeck(dbDecks[0]);
          }
        } catch (err) {
          console.error("Session restore failed:", err);
        }
      } else if (event === "SIGNED_IN" && user) {
        // Fresh sign-in: migrate anonymous decks then load cloud decks.
        setAuthUser(user);
        try {
          await migrateAnonymousDecks(s.sessionId);
          const dbDecks = await loadDecks(s.sessionId, user.id);
          setDecks(dbDecks);
        } catch (err) {
          console.error("Auth migration failed:", err);
        }
      } else if (event === "SIGNED_OUT") {
        setAuthUser(null);
        try {
          const dbDecks = await loadDecks(s.sessionId, null);
          setDecks(dbDecks);
        } catch (err) {
          console.error("Failed to reload decks after sign-out:", err);
        }
      } else {
        // TOKEN_REFRESHED and other events — just keep authUser in sync.
        setAuthUser(user);
      }
    });
    return unsubscribe;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reactive auto-tag — runs after every pile change ─────────────────────
  // Detects cards entering/leaving the pile and updates wrecTags accordingly.
  const prevPileRef = useRef([]);
  useEffect(() => {
    const prev = prevPileRef.current;
    prevPileRef.current = pile;

    if (pile.length < prev.length) {
      // Cards removed — purge their oracle_ids from wrecTags and autoTagged
      const kept = new Set(pile.map(c => c.oracle_id).filter(Boolean));
      const removed = prev.map(c => c.oracle_id).filter(id => id && !kept.has(id));
      if (removed.length === 0) return;
      setWrecTags(t => {
        const next = {};
        for (const [cat, ids] of Object.entries(t)) next[cat] = ids.filter(id => !removed.includes(id));
        return next;
      });
      setAutoTagged(s => { const n = new Set(s); removed.forEach(id => n.delete(id)); return n; });
      return;
    }

    if (pile.length > prev.length) {
      // Cards added — auto-detect category for new oracle_ids not yet tagged
      const prevInstances = new Set(prev.map(c => c.instanceId));
      const newCards = pile.filter(c => !prevInstances.has(c.instanceId) && c.oracle_id);
      if (newCards.length === 0) return;

      const candidates = newCards.map(c => ({ oracleId: c.oracle_id, category: autoDetectCategory(c) }))
        .filter(x => x.category);
      if (candidates.length === 0) return;

      setWrecTags(prev => {
        const alreadyTagged = new Set(Object.values(prev).flat());
        const next = { ...prev };
        for (const { oracleId, category } of candidates) {
          if (alreadyTagged.has(oracleId)) continue;
          alreadyTagged.add(oracleId);
          next[category] = [...(next[category] ?? []), oracleId];
        }
        return next;
      });
      setAutoTagged(s => {
        const n = new Set(s);
        candidates.forEach(({ oracleId }) => n.add(oracleId));
        return n;
      });
    }
  }, [pile]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Debounced auto-save ───────────────────────────────────────────────────
  useEffect(() => {
    if (!appReady || !sessionId || !activeDeckId) return;
    const s = stateRef.current;
    const timer = setTimeout(async () => {
      const name = computeDeckName(s.commanderCard, s.query);
      try {
        // PERSISTS: all state changes — debounced backup (covers swipe-keep,
        // commander long-press, and any mutation not explicitly saved immediately)
        await saveDeck(sessionId, {
          id: s.activeDeckId, name,
          commander_name: s.commanderCard?.name ?? null,
          commander_instance_id: s.commander ?? null,
          commander_card: s.commanderCard ?? null,
          pile: s.pile, maybeboard: s.maybeboard,
          swipe_cards: s.swipeCards, swipe_index: s.swipeIndex, query: s.query,
          tags: s.wrecTags,
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
                tags: s.wrecTags,
                last_opened_at: now,
              }
            : d
        ));
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [pile, swipeCards, swipeIndex, commander, commanderCard, maybeboard, query, wrecTags, activeDeckId, sessionId, appReady, authUser]);

  // ── Mirror decks to localStorage (instant restore on next mount) ──────────
  useEffect(() => {
    if (!appReady) return;
    try { localStorage.setItem("deckstack_decks", JSON.stringify(decks)); }
    catch (err) { console.warn("localStorage decks write failed:", err); }
  }, [decks, appReady]);

  // ── Write active session to sessionStorage (survives refresh, not tab-close)
  useEffect(() => {
    if (!appReady || !activeDeckId) return;
    const s = stateRef.current;
    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem("deckstack_session", JSON.stringify({
          id:                    s.activeDeckId,
          name:                  computeDeckName(s.commanderCard, s.query),
          commander_name:        s.commanderCard?.name ?? null,
          commander_instance_id: s.commander ?? null,
          commander_card:        s.commanderCard ?? null,
          pile:                  s.pile,
          maybeboard:            s.maybeboard,
          swipe_cards:           s.swipeCards,
          swipe_index:           s.swipeIndex,
          query:                 s.query,
          tags:                  s.wrecTags,
        }));
      } catch (err) { console.warn("sessionStorage write failed:", err); }
    }, 250);
    return () => clearTimeout(timer);
  }, [pile, commander, commanderCard, maybeboard, swipeCards, swipeIndex, query, wrecTags, activeDeckId, appReady]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  // Returns the first brew that already uses this commander (by Scryfall ID,
  // falling back to name). Brews with no commander_card are exempt.
  function commanderAlreadyBrewed(card, excludeId = null) {
    if (!card?.name) return null;
    return decks.find(d => {
      if (d.id === excludeId || !d.commander_card) return false;
      return card.id && d.commander_card.id
        ? d.commander_card.id   === card.id
        : d.commander_card.name === card.name;
    }) ?? null;
  }

  function showToast(msg) {
    clearTimeout(toastTimer.current);
    setToastMsg(msg);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3500);
  }

  // ── Search ────────────────────────────────────────────────────────────────
  async function handleSearch(q) {
    setLoading(true); setError(null);

    // cancel any in-flight background fetch from a prior search
    bgFetchAbort.current?.abort();
    bgFetchAbort.current = null;

    // Capture commander lock BEFORE any state mutations.
    // A brew's commander is immutable once set — pile.length is not the gate.
    // Read from the stored deck record (covers the empty-pile case), then fall
    // back to the in-memory instanceId lookup for the long-press assignment.
    const activeDeckCommander = activeDeckId
      ? (decks.find(d => d.id === activeDeckId)?.commander_card ?? null)
      : null;
    const lockedCard = activeDeckCommander
      ?? (commander !== null ? (pile.find(c => c.instanceId === commander) ?? commanderCard) : null);
    const effectiveCommanderCard = lockedCard ?? commanderCard;

    try {
      setSwipeOrder("name");
      setSwipeDir("desc");
      const { cards: rawFirstCards, nextPage } = await fetchFirstPageForSwipe(q, effectiveCommanderCard, { order: "name", dir: "auto" });
      const firstCards = rawFirstCards.filter(c => !isBasicLand(c));
      if (rawFirstCards.length !== firstCards.length) {
        console.log(`Filtered ${rawFirstCards.length - firstCards.length} basic land(s) from swipe queue`);
      }

      const deckName = computeDeckName(effectiveCommanderCard, q);

      let targetDeckId = activeDeckId;
      if (!targetDeckId) {
        // No active brew: if this commander already has a brew, redirect to it
        const duplicate = commanderAlreadyBrewed(effectiveCommanderCard);
        if (duplicate) {
          setLoading(false);
          setActiveDeckId(duplicate.id);
          restoreDeck(duplicate);
          showToast(`A brew for ${duplicate.commander_card?.name ?? effectiveCommanderCard?.name} already exists`);
          return;
        }

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
        // Existing brew: if the commander is changing to one that's already brewed, block
        if (effectiveCommanderCard && !lockedCard) {
          const currentCommander = decks.find(d => d.id === targetDeckId)?.commander_card;
          if (currentCommander?.name !== effectiveCommanderCard.name) {
            const duplicate = commanderAlreadyBrewed(effectiveCommanderCard, targetDeckId);
            if (duplicate) {
              setLoading(false);
              showToast(`A brew for ${effectiveCommanderCard.name} already exists`);
              return;
            }
          }
        }

        setDecks(ds => ds.map(d =>
          d.id === targetDeckId
            ? { ...d, name: deckName, commander_card: effectiveCommanderCard ?? null, swipe_cards: firstCards, swipe_index: 0, query: q, last_opened_at: new Date().toISOString() }
            : d
        ));
      }

      setQuery(q); setSwipeCards(firstCards); setSwipeIndex(0); setSwipeDisplayLimit(20);
      if (lockedCard) setCommanderCard(lockedCard);
      setSwipeMounted(true);
      setSwipeKey(k => k + 1);
      setScreen("swipe");
      setLoading(false);

      const deckPayload = {
        id: targetDeckId, name: deckName,
        commander_name: effectiveCommanderCard?.name ?? null,
        commander_instance_id: commander ?? null,
        commander_card: effectiveCommanderCard ?? null,
        pile, maybeboard, swipe_cards: firstCards,
        swipe_index: 0, query: q,
        last_opened_at: new Date().toISOString(),
      };
      if (sessionId) {
        // PERSISTS: create/update deck on search
        saveDeck(sessionId, deckPayload, authUser?.id ?? null).catch(err => {
          console.error("Failed to save deck on search:", err);
          showToast("Couldn't save brew — check your connection");
        });
      }

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
          all = [...all, ...more.filter(c => !isBasicLand(c))].slice(0, CAP);
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
      try {
        // PERSISTS: delete deck (clear pile) — awaited so local state only clears on success
        await deleteDeck(sessionId, activeDeckId, authUser?.id ?? null);
      } catch (err) {
        console.error("Failed to delete deck:", err);
        showToast("Couldn't delete brew — try again");
        return; // Don't clear local state if the DB delete failed
      }
      setDecks(ds => ds.filter(d => d.id !== activeDeckId));
    }
    sessionStorage.removeItem("deckstack_session");
    setPile([]); setCommander(null); setCommanderCard(null);
    setMaybeboard([]); setSwipeCards([]); setSwipeIndex(0);
    setQuery(""); setSwipeMounted(false); setActiveDeckId(null);
    setWrecTags({}); setAutoTagged(new Set()); setPendingTagCard(null);
    setError(null); setScreen("search");
  }

  // ── Import deck ───────────────────────────────────────────────────────────
  async function handleImport(importedPile, importedCommanderCard) {
    const effectiveCommanderCard = importedCommanderCard ?? null;
    const effectiveCommander     = importedCommanderCard?.instanceId ?? null;
    const deckName = effectiveCommanderCard?.name || "Imported Deck";

    // Block if any brew already uses this commander
    if (effectiveCommanderCard) {
      const duplicate = commanderAlreadyBrewed(effectiveCommanderCard);
      if (duplicate) {
        showToast(`A brew for ${effectiveCommanderCard.name} already exists`);
        return;
      }
    }

    // Save current active brew before switching away (same pattern as handleNewDeck)
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
        tags: s.wrecTags,
      }, s.authUser?.id ?? null).catch(err => {
        console.error("Failed to save deck before import:", err);
      });
    }

    // Always INSERT a new brew — never overwrite the active brew
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

    setPile(importedPile);
    setCommander(effectiveCommander);
    setCommanderCard(effectiveCommanderCard);
    setSwipeCards([]); setSwipeIndex(0); setMaybeboard([]); setQuery("");
    setSwipeMounted(false);
    setWrecTags({}); setAutoTagged(new Set()); setPendingTagCard(null);
    setScreen("pile");

    setActiveDeckId(newDeckId);
    setDecks(ds => [newDeck, ...ds]);

    if (sessionId) {
      // PERSISTS: create deck (import always creates a new brew)
      saveDeck(sessionId, newDeck, authUser?.id ?? null).catch(err => {
        console.error("Failed to save imported deck:", err);
        showToast("Import saved locally — cloud sync failed");
      });
    }
  }

  // ── Switch deck ───────────────────────────────────────────────────────────
  function handleSwitchDeck(deckId) {
    const deck = decks.find(d => d.id === deckId);
    if (!deck) return;

    if (sessionId && activeDeckId) {
      const s = stateRef.current;
      // PERSISTS: save current deck state before switching
      saveDeck(sessionId, {
        id: s.activeDeckId,
        name: computeDeckName(s.commanderCard, s.query),
        commander_name: s.commanderCard?.name ?? null,
        commander_instance_id: s.commander ?? null,
        commander_card: s.commanderCard ?? null,
        pile: s.pile, maybeboard: s.maybeboard,
        swipe_cards: s.swipeCards, swipe_index: s.swipeIndex, query: s.query,
      }, s.authUser?.id ?? null).catch(err => {
        console.error("Failed to save deck before switch:", err);
        showToast("Couldn't save recent changes");
      });
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
      // PERSISTS: save current deck state before new brew
      saveDeck(sessionId, {
        id: s.activeDeckId,
        name: computeDeckName(s.commanderCard, s.query),
        commander_name: s.commanderCard?.name ?? null,
        commander_instance_id: s.commander ?? null,
        commander_card: s.commanderCard ?? null,
        pile: s.pile, maybeboard: s.maybeboard,
        swipe_cards: s.swipeCards, swipe_index: s.swipeIndex, query: s.query,
      }, s.authUser?.id ?? null).catch(err => {
        console.error("Failed to save deck before new brew:", err);
        showToast("Couldn't save recent changes");
      });
    }
    sessionStorage.removeItem("deckstack_session");
    setPile([]); setCommander(null); setCommanderCard(null);
    setMaybeboard([]); setSwipeCards([]); setSwipeIndex(0);
    setQuery(""); setSwipeMounted(false); setActiveDeckId(null);
    setWrecTags({}); setAutoTagged(new Set()); setPendingTagCard(null);
    setScreen("search");
  }

  // ── Delete deck ───────────────────────────────────────────────────────────
  async function handleDeleteDeck(deckId) {
    // PERSISTS: delete deck — awaited; throws to BrewsScreen which shows deleteError
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
        setWrecTags({}); setAutoTagged(new Set()); setPendingTagCard(null);
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

  // ── Resort swipe queue ────────────────────────────────────────────────────
  async function handleResort(order, dir) {
    bgFetchAbort.current?.abort();
    bgFetchAbort.current = null;

    const s = stateRef.current;
    try {
      const { cards: rawFirstCards, nextPage } = await fetchFirstPageForSwipe(s.query, s.commanderCard, { order, dir });
      const firstCards = rawFirstCards.filter(c => !isBasicLand(c));
      if (rawFirstCards.length !== firstCards.length) {
        console.log(`Filtered ${rawFirstCards.length - firstCards.length} basic land(s) from swipe queue`);
      }
      setSwipeCards(firstCards);
      setSwipeIndex(0);
      setSwipeDisplayLimit(20);
      setSwipeKey(k => k + 1);

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
          all = [...all, ...more.filter(c => !isBasicLand(c))].slice(0, CAP);
          setSwipeCards([...all]);
          url = next && all.length < CAP ? next : null;
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message);
    }
  }

  function handleSortChange(order, dir) {
    setSwipeOrder(order);
    setSwipeDir(dir);
    handleResort(order, dir);
  }

  // ── Commander card lock guard (prevents UI pickers from overwriting a brew's commander) ──
  // PERSISTS: commanderCard change — `commanderCard` is in the auto-save dep array so
  // the debounced save fires automatically within 1500ms of any change here.
  function handleCommanderCardChange(newCard) {
    const activeDeckCommander = activeDeckId
      ? (decks.find(d => d.id === activeDeckId)?.commander_card ?? null)
      : null;
    // Lock fires whenever the brew has a commander set — pile size is not the gate.
    // handleSearch and handleImport enforce their own lock logic independently.
    if (newCard !== null && activeDeckCommander) {
      return;
    }
    setCommanderCard(newCard);
  }

  // ── Immediate save triggered from PileScreen after pile/maybeboard mutations ──
  // Called with the already-computed new arrays so the save doesn't depend on
  // React having committed the state update yet.
  function handleSaveFromPileScreen(newPile, newMaybeboard) {
    const s = stateRef.current;
    if (!s.sessionId || !s.activeDeckId) return;
    // PERSISTS: pile and maybeboard mutations (immediate write ahead of auto-save;
    // covers remove card, move pile↔maybeboard, qty change, drag reorder)
    saveDeck(s.sessionId, {
      id: s.activeDeckId,
      name: computeDeckName(s.commanderCard, s.query),
      commander_name: s.commanderCard?.name ?? null,
      commander_instance_id: s.commander ?? null,
      commander_card: s.commanderCard ?? null,
      pile: newPile,
      maybeboard: newMaybeboard,
      swipe_cards: s.swipeCards,
      swipe_index: s.swipeIndex,
      query: s.query,
      tags: s.wrecTags,
      last_opened_at: new Date().toISOString(),
    }, s.authUser?.id ?? null).catch(err => console.error("Immediate save failed:", err));
  }

  // ── Commander assignment guard ────────────────────────────────────────────
  // PERSISTS: commander change — `commander` is in the auto-save dep array so
  // the debounced save fires automatically within 1500ms of any change here.
  function handleCommanderChange(instanceId) {
    if (!instanceId) { setCommander(null); return; }
    const card = pile.find(c => c.instanceId === instanceId);
    if (card) {
      const duplicate = commanderAlreadyBrewed(card, activeDeckId);
      if (duplicate) {
        showToast(`A brew for ${card.name} already exists`);
        return;
      }
    }
    setCommander(instanceId);
  }

  // ── Set commander for any brew by deck ID (used from BrewsScreen) ─────────
  function handleSetCommanderForDeck(deckId, card) {
    setDecks(ds => ds.map(d =>
      d.id === deckId
        ? { ...d, commander_name: card.name, commander_card: card }
        : d
    ));
    if (deckId === activeDeckId) {
      setCommanderCard(card);
    }
    const deck = decks.find(d => d.id === deckId);
    if (sessionId && deck) {
      // PERSISTS: set commander card for named deck
      saveDeck(sessionId, {
        id: deckId,
        name: deck.name,
        commander_name: card.name,
        commander_instance_id: deck.commander_instance_id ?? null,
        commander_card: card,
        pile: deck.pile ?? [],
        maybeboard: deck.maybeboard ?? [],
        swipe_cards: deck.swipe_cards ?? [],
        swipe_index: deck.swipe_index ?? 0,
        query: deck.query ?? null,
      }, authUser?.id ?? null).catch(err => {
        console.error("Failed to save commander:", err);
        showToast("Couldn't save commander — try again");
      });
    }
  }

  // ── Swipe keep — merges stackable cards rather than pushing duplicates ──────
  function handleSwipePileChange(newPileOrUpdater) {
    if (typeof newPileOrUpdater === "function") {
      // Functional update from SwipeScreen — apply updater then handle stackable merge inside setPile
      setPile(prev => {
        const next = newPileOrUpdater(prev);
        if (next.length !== prev.length + 1) return next;
        const added = next[next.length - 1];
        if (!isStackable(added)) return next;
        const idx = prev.findIndex(c => c.name === added.name);
        if (idx >= 0) return prev.map((c, i) => i === idx ? { ...c, qty: (c.qty ?? 1) + 1 } : c);
        return [...prev, { ...added, qty: 1 }];
      });
      return;
    }
    // Array form (undo/remove path)
    if (newPileOrUpdater.length !== pile.length + 1) {
      setPile(newPileOrUpdater);
      return;
    }
    const added = newPileOrUpdater[newPileOrUpdater.length - 1];
    if (!isStackable(added)) {
      setPile(newPileOrUpdater);
      return;
    }
    const existingIdx = pile.findIndex(c => c.name === added.name);
    if (existingIdx >= 0) {
      setPile(pile.map((c, i) => i === existingIdx ? { ...c, qty: (c.qty ?? 1) + 1 } : c));
    } else {
      setPile([...pile, { ...added, qty: 1 }]);
    }
  }

  // ── Double-tap tag picker ─────────────────────────────────────────────────

  function handleDoubleTag(oracleId) {
    if (!oracleId) return;
    const card = pile.find(c => c.oracle_id === oracleId)
      ?? maybeboard.find(c => c.oracle_id === oracleId);
    if (card) setPendingTagCard(card);
  }

  function handleAssignTag(oracleId, category) {
    if (!category) return;
    setWrecTags(prev => {
      const current = prev[category] ?? [];
      const isTagged = current.includes(oracleId);
      return {
        ...prev,
        [category]: isTagged
          ? current.filter(id => id !== oracleId)
          : [...current, oracleId],
      };
    });
    setAutoTagged(prev => { const n = new Set(prev); n.delete(oracleId); return n; });
  }

  // ── Nav helpers ───────────────────────────────────────────────────────────
  function goToStack() {
    if (swipeMounted) setScreen("swipe");
    else setScreen("search");
  }

  function goToSearch() { setScreen("search"); }

  function goToPile() { setScreen("pile"); }

  function goToMaybe() { setScreen("maybe"); }

  function goToTags() { setScreen("tags"); }

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
          onCommanderCardChange={handleCommanderCardChange}
        />
      )}

      {swipeMounted && (
        <div style={{ display: screen === "swipe" ? "block" : "none" }}>
          <SwipeScreen
            key={swipeKey}
            cards={swipeCards.slice(0, swipeDisplayLimit)}
            pile={pile}
            onPileChange={handleSwipePileChange}
            maybeboard={maybeboard}
            onMaybeboardChange={setMaybeboard}
            onGoToPile={goToPile}
            onGoToSearch={goToSearch}
            onSearchMore={handleSearchMore}
            commanderCard={commanderCard}
            onCommanderCardChange={handleCommanderCardChange}
            initialIndex={swipeIndex}
            onIndexChange={setSwipeIndex}
            swipeOrder={swipeOrder}
            swipeDir={swipeDir}
            onSortChange={handleSortChange}
            onGoToBrews={goToProfile}
            activeDeckId={activeDeckId}
            onSavePile={newPile => handleSaveFromPileScreen(newPile, maybeboard)}
            onDoubleTag={handleDoubleTag}
          />
        </div>
      )}

      {(screen === "pile" || screen === "maybe") && (
        <PileScreen
          pile={pile}
          onPileChange={setPile}
          onClearPile={handleClearPile}
          commander={commander}
          onCommanderChange={handleCommanderChange}
          commanderCard={commanderCard}
          onCommanderCardChange={handleCommanderCardChange}
          maybeboard={maybeboard}
          onMaybeboardChange={setMaybeboard}
          initialTab={screen === "maybe" ? "maybe" : "deck"}
          decks={decks}
          activeDeckId={activeDeckId}
          onSave={handleSaveFromPileScreen}
          onDoubleTag={handleDoubleTag}
          onAssignTag={handleAssignTag}
          wrecTags={wrecTags}
        />
      )}

      {screen === "tags" && (
        <TagsScreen
          pile={pile}
          wrecTags={wrecTags}
          autoTagged={autoTagged}
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
          onSetCommanderForDeck={handleSetCommanderForDeck}
        />
      )}

      {/* ── Toast ── */}
      {toastMsg && (
        <div style={{
          position: "fixed",
          bottom: `calc(${NAV_HEIGHT}px + max(16px, env(safe-area-inset-bottom)) + 10px)`,
          left: "50%", transform: "translateX(-50%)",
          zIndex: 500,
          background: "rgba(22,22,26,0.97)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 10,
          padding: "10px 18px",
          color: "var(--text)",
          fontSize: 13,
          fontFamily: "'DM Sans', sans-serif",
          maxWidth: "min(90vw, 360px)",
          width: "max-content",
          textAlign: "center",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}>
          {toastMsg}
        </div>
      )}

      {/* ── WREC tag picker (double-tap, z-index 400) ── */}
      {pendingTagCard && (
        <WrecTagPicker
          card={pendingTagCard}
          wrecTags={wrecTags}
          onAssign={handleAssignTag}
          onClose={() => setPendingTagCard(null)}
        />
      )}

      {/* ── Bottom nav ── */}
      {showNav && (
        <BottomNav
          screen={screen}
          onGoToStack={goToStack}
          onGoToPile={goToPile}
          onGoToMaybe={goToMaybe}
          onGoToTags={goToTags}
          onGoToProfile={goToProfile}
        />
      )}

      <AuthSheet
        open={authSheetOpen}
        onClose={() => setAuthSheetOpen(false)}
        user={authUser}
      />

      <div style={{ position: "absolute", width: 0, height: 0, overflow: "hidden", pointerEvents: "none" }}>
        <Turnstile siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY} onSuccess={initSession} />
      </div>
    </>
  );
}
