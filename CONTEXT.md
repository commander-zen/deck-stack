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
| Build | Vite 5 |
| Deploy | Vercel (auto-deploy from `master` branch) |
| Styling | Inline styles + CSS variables (no Tailwind, no CSS modules) |
| State | React `useState` only — no Redux, no Zustand |
| Persistence | `localStorage` (no backend, no auth, no database) |
| API | Scryfall REST API (public, no key required) |
| Fonts | Bebas Neue, DM Sans, IBM Plex Mono (Google Fonts) |

---

## CSS Variables (Design Tokens)

```css
--bg:        #0d0d0f   /* page background */
--panel:     #16161a   /* card/surface */
--panel2:    #1e1e24   /* elevated surface */
--primary:   #5b8fff   /* blue — CTAs, active states */
--secondary: #a78bfa   /* purple — Moxfield, undo */
--success:   #34d399   /* green — keep, copy confirmed */
--danger:    #ff4d6d   /* red — pass, clear, remove */
--muted:     #555566   /* subdued text/icons */
--active:    #f59e0b   /* amber — WREC warning range */
--text:      #e8e8f0   /* primary text */
```

---

## File Structure

```
deck-stack/
├── index.html              # Entry — sets fonts, base styles, viewport
├── package.json            # ⚠️ name still says "deck-swipe", needs fix
├── vite.config.js
├── .env.local
├── .claude/                # Claude Code config
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx            # React root mount
    ├── App.jsx             # Root state, routing, persistence
    ├── index.css           # CSS variables + resets
    ├── screens/
    │   ├── LandingScreen.jsx   # Commander search + "Build by Strategy" entry (currently unused in App.jsx routing)
    │   ├── SearchScreen.jsx    # Main entry: logo + SearchForm
    │   ├── SwipeScreen.jsx     # Card swipe mechanic
    │   └── PileScreen.jsx      # Deck review, export, commander assignment
    ├── components/
    │   ├── BottomNav.jsx       # Fixed bottom tab bar (SWIPE / PILE)
    │   ├── SearchSheet.jsx     # Slide-up search modal (used mid-session)
    │   ├── SearchForm.jsx      # Full search form with advanced filters
    │   └── DeckReviewPill.jsx  # Floating pill + slide-up card list (text/visual views)
    └── lib/
        ├── scryfall.js         # All Scryfall API calls + query builder
        └── wrec.js             # WREC score engine
```

---

## App Flow

```
SearchScreen
  └── user submits query
      └── fetchForSwipe() → up to 175 cards, paginated
          └── SwipeScreen (mounted, hidden when on other tabs)
              ├── swipe right / ♥ button → card added to pile
              ├── swipe left / ✕ button → card passed
              ├── UNDO → removes last action
              └── keyboard: ArrowRight=keep, ArrowLeft=pass, Z=undo
          └── BottomNav (SWIPE / PILE tabs)
          └── SearchSheet (slide-up, triggered by 🔍 icon — new search keeps pile)
              └── PileScreen
                  ├── visual 2-col card grid
                  ├── long-press card → toggle as Commander (gold outline + 👑)
                  ├── tap card → lightbox (drag down to dismiss)
                  ├── COPY → clipboard export
                  ├── COPY + MOXFIELD → clipboard + opens moxfield.com/import
                  ├── ← SEARCH → go back (keeps pile)
                  └── CLEAR PILE → wipes everything, returns to SearchScreen
```

---

## State Architecture (App.jsx)

All top-level state lives in `App.jsx`. Key state:

| State | Type | Persisted | Description |
|---|---|---|---|
| `pile` | Card[] | `deckstack_pile` | Kept cards |
| `commander` | string\|null | `deckstack_commander` | instanceId of commander card |
| `swipeCards` | Card[] | `deckstack_cards` | Current search result queue |
| `query` | string | `deckstack_query` | Last search query |
| `screen` | string | `deckstack_screen` | Active screen: search/swipe/pile |
| `swipeMounted` | bool | — | Keeps SwipeScreen in DOM during tab switches |
| `swipeKey` | number | — | Forces SwipeScreen remount on new search |

`SwipeScreen` stays mounted (display:none) when navigating to pile tab so swipe index and history survive tab switches.

Cards in pile get an `instanceId` (via `crypto.randomUUID()`) added at keep-time to allow duplicate cards and precise removal.

---

## Scryfall Integration (`lib/scryfall.js`)

- **User-Agent:** `DeckStack/1.0 (deck-stack.vercel.app)`
- **`fetchForSwipe(query)`** — paginates up to 175 cards, 100ms delay between pages, ordered by EDHREC rank
- **`fetchAllCards(query)`** — full paginator up to 1000 cards (legacy, kept for future use)
- **`searchCommanders(query)`** — autocomplete for commander search (`is:commander`)
- **`fetchRandomCommander()`** — random commander
- **`autocompleteCardNames(query)`** — card name autocomplete (max 8)
- **`buildQuery(filters)`** — assembles Scryfall query string from SearchForm filter state
- **`getCardImage(card, size)`** — handles double-faced cards (uses `card_faces[0]`)
- All queries append `f:commander` automatically via `SearchForm`

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

> ⚠️ WREC/DeckReviewPill with category tagging exists in the codebase but the `_deckCategory` property is **not currently being set** during swipe — cards in the pile won't have categories unless this is wired up. This is an open gap.

---

## Known Issues / Open Work

- `package.json` name is still `deck-swipe` → update to `deck-stack`
- GitHub links in `SearchScreen.jsx` footer still point to `kylo-ben/deck-swipe` → update to `commander-zen/deck-stack`
- `LandingScreen.jsx` exists (commander search + "Build by Strategy" flow) but is **not wired into App.jsx routing** — it's dead code currently
- `_deckCategory` is never set on swiped cards → WREC scoring and category export don't work end-to-end yet
- `DeckReviewPill` component exists but may not be rendered in current App.jsx (PileScreen handles pile display directly)
- `pages/` folder exists in src but appears empty or unused

---

## Conventions

- No CSS framework — all styling is inline React style objects using CSS variables
- No routing library — screen state is managed manually via `screen` useState
- No backend — all data is Scryfall API + localStorage
- Fonts: Bebas Neue for headers/labels, DM Sans for body, IBM Plex Mono for code/query display
- Button labels in ALL CAPS with letter-spacing is the design language
- Mobile-first: max-width 600px centered, touch events (pointer API), `dvh` units, safe-area insets
