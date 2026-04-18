# DECK STACK — AI Context Document
> Paste this at the start of any new Claude session to restore full project context.

---

## What is Deck Stack?

Deck Stack is a mobile-first MTG Commander deck-building web app. The core mechanic is a Tinder-style swipe interface: users search for cards via Scryfall, then swipe through results keeping or passing each one to assemble a deck pile. The app is Commander-format only.

**Live URL:** https://deck-stack.vercel.app  
**GitHub:** https://github.com/commander-zen/deck-stack  
**Vercel project:** `deck-stack` (kylo-ben's projects)  
**Status:** Early/active development. Only used by the developer and one friend so far.

> ⚠️ The name was previously "Deck Swipe" — it is now **Deck Stack**, full stop. `package.json` still says `deck-swipe` and needs to be updated. GitHub links in `SearchScreen.jsx` footer still point to `kylo-ben/deck-swipe` and need updating.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 18 (Vite, ESM) |
| Build | Vite 5 + `vite-plugin-pwa` |
| Deploy | Vercel (auto-deploy from `master` branch) |
| Styling | Inline styles + CSS variables (no Tailwind, no CSS modules) |
| State | React `useState` only — no Redux, no Zustand |
| Persistence | `localStorage` (no backend, no auth, no database) |
| API | Scryfall REST API (public, no key required) |
| Fonts | Bebas Neue, DM Sans, IBM Plex Mono (Google Fonts) |
| PWA | `vite-plugin-pwa` — installable on iOS via Safari "Add to Home Screen" |

---

## CSS Variables (Design Tokens)

Defined in `src/index.css`:

```css
--bg:        #0d0d0f   /* page background */
--panel:     #16161a   /* card/surface */
--panel2:    #1e1e24   /* elevated surface */
--primary:   #5b8fff   /* blue — CTAs, active states */
--secondary: #a78bfa   /* purple — import, secondary actions */
--success:   #34d399   /* green — keep, copy confirmed */
--danger:    #ff4d6d   /* red — pass, clear, remove, error boundary */
--muted:     #555566   /* subdued text/icons */
--active:    #f59e0b   /* amber — WREC warning range */
--text:      #e8e8f0   /* primary text */
```

---

## File Structure

```
deck-stack/
├── index.html              # Entry — sets fonts, base styles, viewport, PWA meta tags
├── package.json            # ⚠️ name still says "deck-swipe", needs fix
├── vite.config.js          # Vite + React + VitePWA plugin config
├── public/
│   ├── favicon.svg
│   └── icons/
│       ├── icon-192.png    # PWA / apple-touch-icon
│       └── icon-512.png    # PWA maskable icon
└── src/
    ├── main.jsx            # React root mount, ErrorBoundary wrapper, SW registration
    ├── App.jsx             # Root state, routing, persistence
    ├── index.css           # CSS variables + resets
    ├── screens/
    │   ├── LandingScreen.jsx   # Commander search + "Build by Strategy" entry (DEAD CODE — not wired into App.jsx)
    │   ├── SearchScreen.jsx    # Main entry: two-step layout (Commander + Search), IMPORT DECK button
    │   ├── SwipeScreen.jsx     # Card swipe mechanic + top SWIPE/PILE tab bar
    │   └── PileScreen.jsx      # Deck review, export, commander assignment, maybeboard
    └── components/
        ├── BottomNav.jsx       # Fixed bottom tab bar — FILE EXISTS but is NOT rendered (removed from App.jsx)
        ├── ErrorBoundary.jsx   # Class component — catches crashes, shows recovery UI
        ├── ImportSheet.jsx     # Slide-up sheet — paste decklist or Moxfield URL → imports to pile
        ├── SearchSheet.jsx     # Slide-up search modal (used mid-session via 🔍 icon)
        ├── SearchForm.jsx      # Full search form with collapsible advanced filters
        ├── PileSwipeScreen.jsx # Full-screen swipe review of pile/maybeboard cards
        └── DeckReviewPill.jsx  # Floating pill + slide-up card list (may not be active)
    └── lib/
        ├── scryfall.js         # All Scryfall API calls + query builder
        └── wrec.js             # WREC score engine
```

---

## App Flow

```
SearchScreen  (screen === "search")
  ├── Step 1: Commander search (optional) — sets commanderCard for color identity filter
  ├── Step 2: SearchForm — keywords or Scryfall syntax, collapsible filters
  ├── SWIPE button → handleSearch() → fetchForSwipe() → navigates to SwipeScreen
  └── IMPORT DECK button → ImportSheet (slide-up)
      └── paste decklist or Moxfield URL → Scryfall /cards/collection → pile → PileScreen

SwipeScreen  (screen === "swipe", stays mounted hidden when on other tabs)
  ├── Top bar: DECK STACK logo + 🔍 (opens SearchSheet)
  ├── Commander banner (if commanderCard set)
  ├── Tab bar: SWIPE (active) | PILE (n) — PILE navigates to PileScreen
  ├── Card area: drag/pointer swipe gesture only (no pass/keep buttons)
  │   ├── swipe right / ArrowRight → keep (added to pile with instanceId)
  │   ├── swipe left  / ArrowLeft  → pass
  │   ├── Z key → undo last action
  │   └── UNDO text button inline next to counter
  └── Done state → "VIEW PILE" button

PileScreen  (screen === "pile")
  ├── Sticky header: ← (back to swipe) | DECK STACK | 🔍 | ··· (overflow menu)
  │   └── ··· menu: COPY LIST | COPY+MOXFIELD | CLEAR PILE
  ├── Tab bar: DECK (n) | MAYBE (n) — switches active card grid
  ├── Card grid (2-col): tap → lightbox, long-press → toggle Commander (gold outline + 👑)
  ├── FAB (bottom-right): SWIPE TO REVIEW → opens PileSwipeScreen (deck or maybeboard)
  └── PileSwipeScreen: full-screen swipe review — keep stays in pile, pass moves to maybeboard (or removes)

SearchSheet  (slide-up, rendered when inSession && swipeMounted)
  └── Same SearchForm, triggers a new search without clearing pile

ImportSheet  (slide-up from SearchScreen)
  ├── Moxfield URL input → fetches api.moxfield.com/v2/decks/all/{id}
  ├── Decklist textarea → parses "1x Name", "1 Name", bare "Name", MTGO/Arena/Moxfield exports
  ├── // Commander or # Commander section header → sets commander instanceId
  ├── Resolves names via Scryfall POST /cards/collection (75 per batch)
  ├── Partial failures shown as amber warning; all errors shown as red inline
  └── On success: replaces pile, sets commander, navigates to PileScreen

ErrorBoundary  (wraps entire app in main.jsx)
  └── On crash: shows error message (IBM Plex Mono) + two buttons:
      ├── RELOAD APP · CLEAR ALL DATA → localStorage.clear() + reload
      └── KEEP DATA · RELOAD → reload only
```

---

## Navigation Model

Navigation is manual `screen` state (no router). No BottomNav — both SwipeScreen and PileScreen have their own top tab bars.

| From | To | How |
|---|---|---|
| SearchScreen | SwipeScreen | SWIPE button (handleSearch) |
| SearchScreen | PileScreen | IMPORT DECK (handleImport) |
| SwipeScreen | PileScreen | PILE tab in top tab bar |
| PileScreen | SwipeScreen | ← back chevron in header |
| PileScreen | SearchScreen | ← from SwipeScreen → back to search is separate flow |
| Any (in-session) | new search | 🔍 → SearchSheet → handleSheetSearch (keeps pile) |

`SwipeScreen` stays mounted (`display:none`) when navigating away so swipe index and history survive tab switches. `swipeMounted` flag controls this.

---

## State Architecture (App.jsx)

All top-level state lives in `App.jsx`.

| State | Type | Persisted key | Description |
|---|---|---|---|
| `pile` | Card[] | `deckstack_pile` | Kept cards |
| `commander` | string\|null | `deckstack_commander` | **instanceId** of commander card in pile |
| `commanderCard` | Card\|null | `deckstack_commander_card` | Full card object for display/filter |
| `maybeboard` | Card[] | `deckstack_maybeboard` | Maybe board cards |
| `swipeCards` | Card[] | `deckstack_cards` | Current search result queue |
| `query` | string | `deckstack_query` | Last search query |
| `screen` | string | `deckstack_screen` | Active screen: search/swipe/pile |
| `swipeMounted` | bool | — | Keeps SwipeScreen in DOM during tab switches |
| `swipeKey` | number | — | Forces SwipeScreen remount on new search |

**Important distinctions:**
- `commander` is an **instanceId string** (used to find the card in pile via `pile.find(c => c.instanceId === commander)`), not a card name.
- `commanderCard` is the **full card object** used for art display and color identity filtering during search. It does not need to be a pile member.
- Cards in `pile` and `maybeboard` each have an `instanceId` (via `crypto.randomUUID()`) added at keep-time or import-time to allow duplicate cards and precise removal.

**Restore-time integrity checks** (`readSaved*` functions):
- `ensureInstanceIds()` is applied to pile, maybeboard, and swipeCards on restore — any card missing an instanceId gets one assigned (handles data saved before the feature existed).
- `readSavedCommander(pile)` validates the stored instanceId exists in the restored pile; resets to `null` if not found (prevents dangling references after partial data loss).

---

## Scryfall Integration (`lib/scryfall.js`)

- **User-Agent:** `DeckStack/1.0 (deck-stack.vercel.app)`
- **`fetchForSwipe(query, commanderCard)`** — paginates up to 175 cards, 100ms delay between pages, ordered by EDHREC rank; appends `id<=WUBRG` color identity filter if commanderCard has color_identity
- **`fetchAllCards(query)`** — full paginator up to 1000 cards (legacy, kept for future use)
- **`searchCommanders(query)`** — autocomplete for commander search (`is:commander`)
- **`fetchRandomCommander()`** — random commander
- **`fetchCardByName(name)`** — exact name lookup
- **`autocompleteCardNames(query)`** — card name autocomplete (max 8)
- **`buildQuery(filters)`** — assembles Scryfall query string from SearchForm filter state
- **`getCardImage(card, size)`** — handles double-faced cards (uses `card_faces[0]`)
- **`POST /cards/collection`** — used by ImportSheet for bulk name resolution (75 per batch)

---

## WREC Score (`lib/wrec.js`)

Named after Commander content creator Rachel Weeks (@wachelreeks). Measures deck balance against her recommended Commander template.

| Category | Target |
|---|---|
| Ramp | 10 |
| Card Advantage | 12 |
| Disruption | 12 |
| Mass Disruption | 6 |
| Mana Base | 38 |
| Plan | 30 |

- Score of `1.000` is perfect. Over or under is penalized equally.
- Color coding: green = within ±0.08, amber = within ±0.20, red = outside
- Cards are tagged with `_deckCategory` property; untagged cards default to "plan"
- `buildExport()` outputs Moxfield-compatible format with `#tag` annotations

> ⚠️ WREC/DeckReviewPill with category tagging exists in the codebase but the `_deckCategory` property is **not currently being set** during swipe or import — cards in the pile won't have categories unless this is wired up. This is an open gap.

---

## PWA Support

Added via `vite-plugin-pwa`. Configured in `vite.config.js`:
- Manifest: name "Deck Stack", display standalone, theme/bg `#0d0d0f`
- Icons: `/icons/icon-192.png` and `/icons/icon-512.png` (programmatically generated — replaceable with better artwork)
- Service worker: auto-registered in `main.jsx` via `virtual:pwa-register`, mode `generateSW`
- iOS meta tags in `index.html`: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style: black-translucent`, `apple-touch-icon`

---

## Known Issues / Open Work

- `package.json` name is still `deck-swipe` → update to `deck-stack`
- GitHub links in `SearchScreen.jsx` footer still point to `kylo-ben/deck-swipe` → update to `commander-zen/deck-stack`
- `LandingScreen.jsx` exists (commander search + "Build by Strategy" flow) but is **not wired into App.jsx routing** — dead code
- `_deckCategory` is never set on swiped or imported cards → WREC scoring and category export don't work end-to-end
- `DeckReviewPill.jsx` exists but may not be rendered in current App.jsx
- `BottomNav.jsx` still exists as a file (SearchSheet.jsx imports `NAV_HEIGHT` from it) but is not rendered — SearchSheet uses that value for bottom padding; if BottomNav is deleted, SearchSheet will break

---

## Conventions

- No CSS framework — all styling is inline React style objects using CSS variables
- No routing library — screen state is managed manually via `screen` useState
- No backend — all data is Scryfall API + localStorage
- Fonts: Bebas Neue for headers/labels, DM Sans for body, IBM Plex Mono for code/mono display
- Button labels in ALL CAPS with letter-spacing is the design language
- Mobile-first: max-width 430–600px centered, touch events (pointer API), `dvh` units, safe-area insets
- Sheet components (ImportSheet, SearchSheet) follow the same pattern: fixed backdrop + slide-up panel with drag handle, `zIndex: 200/201`, `cubic-bezier(0.32, 0.72, 0, 1)` transition
