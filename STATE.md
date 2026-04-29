<!--
  AUDIT FINDINGS — read before editing persistence logic
  ======================================================

  WHERE STATE LIVES
  ─────────────────
  • React useState (App.jsx) — single source of truth for the running app.
    No Context, no Redux, no Zustand.
  • Supabase `decks` table — authoritative cloud store; read on mount, written on
    every meaningful mutation.
  • localStorage — `deckstack_session_id` (anonymous session UUID) was the ONLY key
    before this audit.  Nothing else was explicitly written to localStorage; deck data
    lived in Supabase only.
  • sessionStorage — NOT used at all before this audit.

  EPHEMERAL VS PERSISTENT
  ────────────────────────
  Intentionally ephemeral (reset on every mount):
    appReady, loading, error, authSheetOpen, toastMsg, swipeMounted, swipeKey,
    swipeDisplayLimit, swipeOrder, swipeDir

  Should survive a refresh (same tab):
    pile, commander, commanderCard, maybeboard, swipeCards, swipeIndex,
    query, screen, activeDeckId, decks

  Should survive tab close / come back tomorrow:
    decks (the saved brews list)

  GAP 1 — NO FAST-PATH RESTORE
  ──────────────────────────────
  initBackground() blocked app readiness behind a Supabase network call.
  Users saw "LOADING…" for 200–500 ms (or up to 5 s if Supabase was slow)
  even when their data was already available locally.  There was no localStorage
  cache of the decks array — on a slow or offline load the 5-second safety timer
  fired and the app showed an empty search screen.

  GAP 2 — NO SESSIONSSTORAGE FOR SWIPE SESSION
  ──────────────────────────────────────────────
  The active swipe session (swipeCards, swipeIndex, pile, commander, etc.) was
  written to Supabase only, with a 1.5-second debounce.  A hard refresh restored
  correctly — but only after the Supabase round-trip completed.

  GAP 3 — DECKS NOT IN LOCALSTORAGE
  ───────────────────────────────────
  `decks` was never written to localStorage.  Offline or slow-Supabase visits
  always showed "No saved brews yet" until the network responded.

  STATE RESETS — NONE UNINTENTIONAL FOUND
  ─────────────────────────────────────────
  No spurious resets were found.  The `restoreDeck()` path (called from
  handleSwitchDeck, handleDeleteDeck, initBackground) is the single restore
  entry-point and behaves correctly.  The swipe dedup useMemo re-derives
  on [cards, pile] as intended.

  "START OVER" ACTION
  ────────────────────
  handleNewDeck() (NEW BREW button in BrewsScreen) is the canonical "start over":
  it saves the current deck, clears all active session state, and navigates to
  the search screen without touching the saved brews list.  After this audit it
  also explicitly clears sessionStorage so a refresh after "new brew" does not
  restore the previous in-progress session.
-->

# Deck Stack — State Persistence

## Storage schema

### sessionStorage

Key: `deckstack_session`

Stores the **active in-progress session** (survives F5 refresh within the same tab,
cleared automatically when the tab or browser window closes).

```json
{
  "id":                    "<uuid>",
  "name":                  "Commander Name",
  "commander_name":        "Commander Name",
  "commander_instance_id": "<uuid> | null",
  "commander_card":        { ...Scryfall card object },
  "pile":                  [ ...card objects with instanceId ],
  "maybeboard":            [ ...card objects with instanceId ],
  "swipe_cards":           [ ...card objects ],
  "swipe_index":           5,
  "query":                 "last search query"
}
```

Written: debounced 250 ms after any pile / swipe / commander / query change.  
Cleared: on tab/window close (browser-native), and explicitly on "NEW BREW" and "CLEAR PILE" actions.

---

### localStorage

Key: `deckstack_decks`

Mirrors the full `decks` state array so the brews list is immediately available
on the next mount without waiting for Supabase.

Written: synchronously whenever the `decks` React state changes.  
Read: once via lazy `useState` initializer on component mount.

Key: `deckstack_session_id`

The anonymous session UUID (pre-existing, unchanged).

---

### Supabase `decks` table

Authoritative cloud store.  Written on every meaningful mutation (swipe-keep,
import, pile mutation, commander change, deck CRUD).  Read in the background after
the fast-path local restore.

---

## Init flow (after this audit)

```
mount
  │
  ├─ sessionStorage has session?
  │     YES → restoreDeck() immediately → setAppReady(true) — no LOADING screen
  │     NO  ─────────────────────────────────────────────────────────────────────┐
  │                                                                               │
  ├─ localStorage has decks?                                                      │
  │     YES → restoreDeck(decks[0]) immediately → setAppReady(true)              │
  │     NO  → show LOADING screen (first ever visit)                             │
  │                                                                               │
  └─ Background: Supabase sync (always runs regardless of fast-path result)      │
        getOrCreateSession()                                                      │
        getSession() → setAuthUser()                                             │
        loadDecks() → setDecks() + update localStorage                          │
        if no local session was found → restoreDeck(dbDecks[0])                 │
        finally → setAppReady(true)                               ◄──────────────┘
```
