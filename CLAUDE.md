## Standing Instructions
At the end of every session where architectural changes were made (new screens, 
new components, new libraries, auth/backend changes, navigation changes, or 
resolved known issues), update this file to reflect the current state before closing.

What counts as "update-worthy":
New or deleted files in src/
New dependencies in package.json
Auth/Supabase changes
Navigation model changes
Known issues resolved or newly discovered
Stack changes

What doesn't need an update:
Bug fixes
Style tweaks
Content/copy changes

# DECK STACK — AI Context Document
> Paste this at the start of any new Claude session to restore full project context.

---

## What is Deck Stack?

Deck Stack is a mobile-first MTG Commander deck-building web app. The core mechanic is a Tinder-style swipe interface: users search for cards via Scryfall, then swipe through results keeping or passing each one to assemble a deck pile. The app is Commander-format only. Users can manage multiple saved decks ("brews") and optionally sign in to sync across devices via Supabase.

**Live URL:** https://deck-stack.vercel.app  
**GitHub:** https://github.com/commander-zen/deck-stack  
**Vercel project:** `deck-stack` (auto-deploys from `master` branch)  
**Status:** Active development. Used by developer and a small number of friends.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 18 (Vite, ESM) |
| Build | Vite 5 + `vite-plugin-pwa` |
| Deploy | Vercel (auto-deploy from `master` branch) |
| Styling | Inline styles + CSS variables (no Tailwind, no CSS modules) |
| State | React `useState` only — no Redux, no Zustand |
| Persistence | `localStorage` (primary) + Supabase (cloud sync when signed in) |
| Auth | Supabase Auth (email/OTP passwordless) |
| Database | Supabase (deck persistence and sync) |
| API | Scryfall REST API (public, no key required) |
| Fonts | Bebas Neue, DM Sans, IBM Plex Mono (Google Fonts) |
| PWA | `vite-plugin-pwa` — installable on iOS via Safari "Add to Home Screen" |
| Env | `.env.local` holds Supabase keys (see `.env.local.example`) |

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
├── index.html                  # Entry — fonts, viewport, PWA meta tags
├── package.json                # name: "deck-stack"
├── vite.config.js              # Vite + React + VitePWA config
├── vercel.json
├── .env.local                  # Supabase keys (gitignored)
├── .env.local.example          # Template for env vars
├── .claude/
│   └── settings.local.json     # Claude Code permissions config
├── supabase/                   # Supabase project config/migrations
├── public/
│   ├── favicon.svg
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
└── src/
    ├── main.jsx                # React root, ErrorBoundary wrapper, SW registration
    ├── App.jsx                 # Root state, routing, persistence (15 KB — large)
    ├── index.css               # CSS variables + resets
    ├── screens/                # ✅ ACTIVE screens
    │   ├── LandingScreen.jsx   # Commander search + "Build by Strategy" entry
    │   ├── SearchScreen.jsx    # Main entry: commander picker + search form + IMPORT
    │   ├── SwipeScreen.jsx     # Card swipe mechanic + top SWIPE/PILE tab bar
    │   └── PileScreen.jsx      # Deck review, export, commander assignment, maybeboard (22 KB)
    ├── pages/                  # ⚠️ LEGACY — likely dead code, not wired into App.jsx
    │   ├── CommanderScreen.jsx
    │   ├── PileScreen.jsx
    │   ├── SearchScreen.jsx
    │   └── SwipeScreen.jsx
    ├── components/
    │   ├── AuthSheet.jsx       # Slide-up auth sheet — email OTP sign-in/sign-out
    │   ├── BottomNav.jsx       # Fixed bottom tab bar — SWIPE | PILE | BREWS (ACTIVE)
    │   ├── DeckReviewPill.jsx  # Floating pill + slide-up card list
    │   ├── ErrorBoundary.jsx   # Class component — catches crashes, shows recovery UI
    │   ├── ImportSheet.jsx     # Slide-up sheet — paste decklist or Moxfield URL
    │   ├── PileSwipeScreen.jsx # Full-screen swipe review of pile/maybeboard cards
    │   ├── QuiverDrawer.jsx    # Slide-up multi-deck manager — "BREWS" — switch/new/delete
    │   ├── SearchForm.jsx      # Full search form with collapsible advanced filters (21 KB)
    │   └── SearchSheet.jsx     # Slide-up search modal (used mid-session via 🔍 icon)
    └── lib/
        ├── auth.js             # Supabase auth helpers (sign in, sign out, session)
        ├── db.js               # Supabase deck persistence (save, load, delete decks)
        ├── scryfall.js         # All Scryfall API calls + query builder
        ├── supabase.js         # Supabase client init (reads env vars)
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
  ├── Tab bar: SWIPE (active) | PILE (n)
  ├── Card area: drag/pointer swipe gesture only (no pass/keep buttons)
  │   ├── swipe right / ArrowRight → keep (added to pile with instanceId)
  │   ├── swipe left  / ArrowLeft  → pass
  │   ├── Z key → undo last action
  │   └── UNDO text button inline next to counter
  └── Done state → "VIEW PILE" button

PileScreen  (screen === "pile")
  ├── Sticky header: ← | DECK STACK | 🔍 | ··· (overflow menu)
  │   └── ··· menu: COPY LIST | COPY+MOXFIELD | CLEAR PILE
  ├── Tab bar: DECK (n) | MAYBE (n)
  ├── Card grid (2-col): tap → lightbox, long-press → toggle Commander (gold outline + 👑)
  └── FAB: SWIPE TO REVIEW → opens PileSwipeScreen

PileSwipeScreen  (full-screen overlay)
  └── Swipe review of pile or maybeboard — keep stays, pass moves to maybeboard (or removes)

QuiverDrawer  (slide-up, opened via BREWS tab in BottomNav)
  ├── Lists all saved decks with commander art thumbnail, card count, last opened time
  ├── Tap deck → switch active deck
  ├── ✕ on deck → confirm → delete
  ├── NEW BREW button → creates fresh deck
  └── Sign-in prompt at bottom → opens AuthSheet

AuthSheet  (slide-up)
  └── Email OTP passwordless auth — sign in to enable cross-device sync via Supabase

SearchSheet  (slide-up, rendered when inSession && swipeMounted)
  └── Same SearchForm, triggers new search without clearing pile

ImportSheet  (slide-up from SearchScreen)
  ├── Moxfield URL → fetches api.moxfield.com/v2/decks/all/{id}
  ├── Decklist textarea → parses multiple export formats
  ├── // Commander or # Commander section header → sets commander
  ├── Resolves via Scryfall POST /cards/collection (75 per batch)
  └── On success: replaces pile, sets commander, navigates to PileScreen

ErrorBoundary  (wraps entire app)
  └── RELOAD APP · CLEAR ALL DATA  or  KEEP DATA · RELOAD
```

---

## Navigation Model

Navigation is manual `screen` state (no router library).

**Two nav bars run simultaneously:**
- **Top tab bar** (inside SwipeScreen/PileScreen): SWIPE | PILE (n)
- **BottomNav** (fixed, always visible): SWIPE | PILE | BREWS

| From | To | How |
|---|---|---|
| SearchScreen | SwipeScreen | SWIPE button |
| SearchScreen | PileScreen | IMPORT DECK |
| SwipeScreen | PileScreen | PILE tab (top or bottom nav) |
| PileScreen | SwipeScreen | ← back chevron |
| Any (in-session) | new search | 🔍 → SearchSheet |
| Any | QuiverDrawer | BREWS tab in BottomNav |

`SwipeScreen` stays mounted (`display:none`) when navigating away so swipe index and history survive tab switches. `swipeMounted` flag controls this.

---

## State Architecture (App.jsx)

All top-level state lives in `App.jsx`.

| State | Type | Persisted | Description |
|---|---|---|---|
| `pile` | Card[] | `deckstack_pile` | Kept cards |
| `commander` | string\|null | `deckstack_commander` | **instanceId** of commander card in pile |
| `commanderCard` | Card\|null | `deckstack_commander_card` | Full card object for display/filter |
| `maybeboard` | Card[] | `deckstack_maybeboard` | Maybeboard cards |
| `swipeCards` | Card[] | `deckstack_cards` | Current search result queue |
| `query` | string | `deckstack_query` | Last search query |
| `screen` | string | `deckstack_screen` | Active screen: search/swipe/pile |
| `swipeMounted` | bool | — | Keeps SwipeScreen in DOM |
| `swipeKey` | number | — | Forces SwipeScreen remount on new search |
| `decks` | Deck[] | localStorage + Supabase | All saved brews |
| `activeDeckId` | string\|null | localStorage | Currently active deck |
| `authUser` | User\|null | — | Supabase auth session user |

**Important distinctions:**
- `commander` is an **instanceId string**, not a card name. Resolved via `pile.find(c => c.instanceId === commander)`.
- `commanderCard` is the full card object for art display and color identity filtering. Does not need to be a pile member.
- Cards in `pile` and `maybeboard` have `instanceId` (via `crypto.randomUUID()`) added at keep/import time.

**Restore-time integrity:**
- `ensureInstanceIds()` applied to pile, maybeboard, swipeCards on restore
- `readSavedCommander(pile)` validates instanceId exists in restored pile; resets to `null` if not found

---

## Multi-Deck / Brews Architecture

Users can maintain multiple saved decks. The active deck's pile/commander/maybeboard is what's shown in the swipe/pile flow.

- Deck list lives in `decks` state (array of deck objects)
- Each deck has: `id`, `name`, `pile`, `commander`, `commander_card`, `maybeboard`, `last_opened_at`
- Switching decks via QuiverDrawer loads that deck's state into the active pile/commander/maybeboard
- NEW BREW creates a fresh empty deck and switches to it
- **Local:** decks persisted to localStorage
- **Cloud:** when signed in, decks synced to Supabase via `lib/db.js`

---

## Auth & Supabase (`lib/auth.js`, `lib/db.js`, `lib/supabase.js`)

- **Client:** initialized in `lib/supabase.js` from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars
- **Auth method:** passwordless email OTP (no passwords)
- **`lib/auth.js`:** sign in, sign out, get session, auth state listener
- **`lib/db.js`:** save deck, load decks, delete deck — all scoped to authenticated user
- **Flow:** guest users get localStorage only; signed-in users get cloud sync layered on top
- **AuthSheet** is the UI entry point — opened from QuiverDrawer's sign-in prompt or elsewhere

---

## Scryfall Integration (`lib/scryfall.js`)

- **User-Agent:** `DeckStack/1.0 (deck-stack.vercel.app)`
- **`fetchForSwipe(query, commanderCard)`** — paginates up to 175 cards, 100ms delay between pages, EDHREC rank order; appends color identity filter if commanderCard set
- **`searchCommanders(query)`** — autocomplete for commander search
- **`fetchRandomCommander()`** — random commander
- **`fetchCardByName(name)`** — exact name lookup
- **`autocompleteCardNames(query)`** — card name autocomplete (max 8)
- **`buildQuery(filters)`** — assembles Scryfall query from SearchForm filters
- **`getCardImage(card, size)`** — handles double-faced cards (uses `card_faces[0]`)
- **`POST /cards/collection`** — bulk name resolution in ImportSheet (75 per batch)

---

## WREC Score (`lib/wrec.js`)

Named after Commander content creator Rachel Weeks. Measures deck balance against her recommended Commander template.

| Category | Target |
|---|---|
| Ramp | 10 |
| Card Advantage | 12 |
| Disruption | 12 |
| Mass Disruption | 6 |
| Mana Base | 38 |
| Plan | 30 |

- Score of `1.000` = perfect. Over/under penalized equally.
- Color coding: green = ±0.08, amber = ±0.20, red = outside
- Cards tagged with `_deckCategory`; untagged cards default to "plan"
- `buildExport()` outputs Moxfield-compatible format with `#tag` annotations

> ⚠️ `_deckCategory` is **not currently being set** during swipe or import — WREC scoring and category export don't work end-to-end. This is an open gap.

---

## PWA Support

- Manifest: name "Deck Stack", display standalone, theme/bg `#0d0d0f`
- Icons: `/icons/icon-192.png` and `/icons/icon-512.png`
- Service worker: auto-registered in `main.jsx`, mode `generateSW`
- iOS: `apple-mobile-web-app-capable`, `black-translucent` status bar, `apple-touch-icon`

---

## Known Issues / Open Work

- `pages/` folder contains `CommanderScreen`, `PileScreen`, `SearchScreen`, `SwipeScreen` — believed to be **dead code/legacy**, not wired into App.jsx. Candidate for deletion.
- `LandingScreen.jsx` in `screens/` — status unclear, may or may not be wired into routing
- `_deckCategory` never set on swiped or imported cards → WREC end-to-end broken
- `DeckReviewPill.jsx` exists — verify whether it's rendered in current App.jsx
- `BottomNav.jsx` imports `NAV_HEIGHT` which `SearchSheet.jsx` also uses — if BottomNav is ever removed, SearchSheet bottom padding will break

---

## Conventions

- No CSS framework — all styling is inline React style objects using CSS variables
- No routing library — screen state managed manually via `screen` useState
- No backend for card data — Scryfall API only
- Supabase used for auth + deck persistence only
- Fonts: Bebas Neue for headers/labels, DM Sans for body, IBM Plex Mono for mono display
- Button labels in ALL CAPS with letter-spacing
- Mobile-first: max-width 430–600px centered, touch events (pointer API), `dvh` units, safe-area insets
- Sheet components follow same pattern: fixed backdrop + slide-up panel, drag handle, `zIndex: 200/201`, `cubic-bezier(0.32, 0.72, 0, 1)` transition
- `.claude/settings.local.json` contains approved Claude Code bash permissions for this project
