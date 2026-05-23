# SESSION STATE — deck-swipe

## Cold Start Prompt
Next: Test in browser — verify 44px touch targets on close/delete/flip buttons, MS icons render with correct variation settings (FILL 0 wght 400 baseline; FILL 1 wght 500 for WREC category icons), WREC category icons display colored MS icons in DeckReviewPill.

---

## Completed ✅

- ✅ **NLP Testbed route at /nlp-testbed** (2026-05-21)
  - `src/pages/NLPTestbed.jsx` created — password gate (sessionStorage), commander input, bracket selector 1–5, query textarea + Run, results area, RAG knowledge base accordion (conversational TRAIN input), system prompt accordion, history accordion
  - RAG chunks persist to `nlp_rag_chunks` localStorage; system prompt to `nlp_system_prompt`
  - Direct browser Anthropic API calls using `VITE_ANTHROPIC_API_KEY` with `anthropic-dangerous-direct-browser-access: true`; model `claude-sonnet-4-20250514`
  - `App.jsx`: import + `window.location.pathname === "/nlp-testbed"` early return added
  - `vercel.json`: SPA rewrite fallback added (`/(.*) → /index.html`)
  - `.env.local`: `VITE_TESTBED_PASSWORD=cardstock2026` and `VITE_ANTHROPIC_API_KEY` added
  - Vercel env vars: `VITE_TESTBED_PASSWORD` and `VITE_ANTHROPIC_API_KEY` added to Production + Development; Preview skipped due to CLI v54 bug (add manually via dashboard if needed)

- ✅ **Demolition — old swipe architecture removed** (2026-05-20)
  - Deleted: `src/screens/SwipeScreen.jsx`, `PileScreen.jsx`, `SearchScreen.jsx`
  - Gutted: `src/components/BottomNav.jsx` → stub with `export const NAV_HEIGHT = 60` only (kept because BrewShelfScreen, DeckDetailScreen, SettingsScreen all import it)
  - App.jsx rewritten from ~1090 lines to ~175 lines: removed all pile/swipe/commander/search/toast/wrec state and handlers; retains Supabase init, auth subscription, deck CRUD, localStorage mirror; renders BrewShelfScreen + DeckDetailScreen + SettingsScreen
  - Bundle: 450 KB → 371 KB gzip

- ✅ **DeckDetailScreen + commander unlock** (2026-05-20)
  - `DeckDetailScreen.jsx` built out: Win98 navy title bars for COMMANDER (1) and each type group (Creatures, Planeswalkers, Instants, Sorceries, Enchantments, Artifacts, Lands, Other), card rows with qty/name/chevron, fixed chrome bar showing card count, card lightbox with WREC tag pills (read-only)
  - Navigation: BrewShelfScreen already wired to `setSelectedDeckId` + `setScreen("deck-detail")`; back button returns to "brews"
  - Commander lock removed from `handleCommanderCardChange` in App.jsx — commander now freely editable like any other field

- ✅ **Typography + iconography migration to Noto Sans + Material Symbols** (2026-05-23)
  - `index.html`: removed Space Grotesk + IBM Plex Mono; added Noto Sans variable font + Material Symbols Outlined variable font; body font-family updated
  - `tokens.css`: `--font-system` updated to `'Noto Sans', sans-serif`
  - All hardcoded `'Space Grotesk', sans-serif`, `'IBM Plex Mono', monospace`, `'DM Sans', sans-serif`, `'Bebas Neue', sans-serif`, `'Tahoma'/'Verdana'`, `'Courier New', monospace`, and bare `monospace` references replaced with `'Noto Sans', sans-serif` across 10+ files
  - Icons migrated to `<span style={{ fontFamily: "'Material Symbols Outlined'", ... }}>icon_name</span>` pattern:
    - `✕` → `close` (CardBrowserScreen, CommanderModal, CommanderSearchSheet, AuthSheet, SearchSheet, QuiverDrawer×2, DeckReviewPill×3, PileSwipeScreen, ImportSheet, BrewsScreen, DeckDetailScreen)
    - `👑` → `crown` (DeckDetailScreen, CommanderSearchSheet, PileSwipeScreen)
    - `↻` → `flip` (CommanderModal, PileSwipeScreen)
    - `♥` → `favorite` (PileSwipeScreen keep button)
    - `▲`/`▼` → `expand_less`/`expand_more` (NLPTestbed accordion)
    - `✓` → `check` (WrecCategoryButtons)
    - `◄ BACK` → `arrow_back` + BACK text (DeckDetailScreen)
    - `▾` → `expand_more` (DeckDetailScreen commander row chevron)
    - SVG search → `search` (SearchForm)
    - SVG filter lines → `filter_list` (SearchForm)
    - SVG gear → `settings` (BrewsScreen)
  - Flagged: WREC category emojis (🌱📖✂️💥🗺️📋) in wrec.js — no Material Symbols equivalent, kept with comment
  - Flagged: Google brand logo SVG in AuthSheet — no Material Symbols equivalent, kept with comment
  - Final grep: zero results for Bebas Neue, DM Sans, Space Grotesk, IBM Plex Mono, Tahoma, Verdana

- ✅ **Touch target audit + MS font-variation-settings + WREC icon migration** (2026-05-23)
  - All 20×20 close buttons → `minWidth/minHeight: 44` (AuthSheet, QuiverDrawer, SearchSheet, CommanderSearchSheet, ImportSheet, CommanderModal, DeckReviewPill, DeckDetailScreen)
  - Flip buttons (PileSwipeScreen, CommanderModal) → `width/height: 44`
  - Deck-delete icon buttons (BrewsScreen, QuiverDrawer) → `minWidth/minHeight: 44`
  - DeckDetailScreen DEL/BACK/SEARCH → `minHeight: 44`
  - WrecCategoryButtons → `minHeight: 44`
  - SearchForm filters toggle + RemovableChip close → `minHeight: 44`
  - DeckReviewPill TextList row remove → `minWidth/minHeight: 44`
  - Flagged: DeckReviewPill VisualGrid 16×16 overlay button (NNG_TOUCH_TARGET: needs design review)
  - CardDetailSheet drag handle: touch handlers added; drag > 80px dismisses with animation
  - `fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24"` added to all 14 files with MS icon spans
  - `wrec.js` CATEGORY_META: `emoji` fields replaced with `icon` (MS name) + `color`; DeckReviewPill renders FILL 1 / wght 500 colored icons

- ✅ **CardBrowserScreen tap-to-detail bottom sheet** (2026-05-23)
  - Tap detection added to `onPU`: if `|dx| < 5 && |dy| < 5`, opens detail sheet (checked before flick-up logic)
  - `CardDetailSheet` component: slides up from bottom covering 85% of screen, `translateY` transition via `detailVisible` state + two-rAF mount trick
  - Sheet contents: card name + mana cost, oracle text, type line + set/collector number, commander legality chip (green/red/muted), USD price
  - Rulings: fetched lazily from Scryfall `/cards/{id}/rulings` on open, cached in `rulingsCache` keyed by card.id — repeat opens skip fetch
  - Backdrop at `zIndex: 299`, sheet at `zIndex: 300`; tap backdrop to dismiss
  - All sheet text uses DM Sans; gesture hint updated to include "TAP FOR DETAILS"

- ✅ **Three screen-level fixes** (2026-05-20)
  - Fix 1: WREC batting-average block and BRACKET display in PileScreen commented out (not deleted)
  - Fix 2: SearchScreen main input `fontSize` set to 16px — prevents iOS auto-zoom on focus
  - Fix 3: SearchScreen rebuilt — removed Set Commander button + panel, removed raw/NLP toggle button, new static subtitle, SEARCH button pinned fixed above nav bar, Win98 chunky segmented progress bar replaces card-fan animation (shows on `loading` prop)

- ✅ **Three structural nav fixes** (2026-05-20)
  - Fix 1+2: Removed `isGhost` logic from `BottomNav.jsx` — nav is now always solid/visible on all screens including SwipeScreen; ghost icons no longer bleed through at bottom of SwipeScreen
  - Fix 3: `handleNewDeck()` in `App.jsx` now creates a new deck with UUID, adds it to the decks list, saves it to Supabase, and navigates to `"pile"` — user arrives at their empty brew instead of SearchScreen

- ✅ **Win98/Y2K Dark chrome styling — Phase 2 inline style pass** (2026-05-20)
  - Applied bevel border system (`--bevel-light`/`--bevel-dark`) to all interactive elements in 9 files
  - Button categories: default chrome (`--color-chrome` + raised bevel), primary/CTA (`--color-titlebar` navy + raised bevel), danger (dark red `#800000` + raised bevel)
  - Input/textarea: inset bevel (`borderTop/Left = --bevel-dark`, `borderBottom/Right = --bevel-light`), `--color-bg` background
  - Surface panels (sheet containers, filter panel, error box): surface bevel (`--color-surface` + raised bevel), `borderRadius: 0`
  - Files updated: `SearchScreen.jsx`, `PileScreen.jsx`, `BrewsScreen.jsx`, `SearchForm.jsx`, `ImportSheet.jsx`, `AuthSheet.jsx`, `ErrorBoundary.jsx`, `SearchSheet.jsx`, `PileSwipeScreen.jsx`
  - `chip()` and `opBtn()` functions in SearchForm now produce depressed vs raised bevel to indicate active toggle state
  - `SwipeScreen.jsx` and `BottomNav.jsx` intentionally excluded per task spec

- ✅ **PileScreen list swipe-to-action + WREC score rebuild** (2026-05-19)
  - `SwipeableRow` component: horizontal drag disambiguation (detects horizontal vs vertical before capturing pointer); spring-back `cubic-bezier(0.34,1.56,0.64,1) 200ms`; fly-off `200ms ease-in`; `onClickCapture` suppresses tap-to-detail on drag release; haptics via `getSettings().haptics` + try/catch
  - DECK tab: swipe left → CUT (red, removes from pile); swipe right → CONSIDER (gold, moves to maybeboard)
  - CONSIDERING tab: swipe left → REMOVE (red); swipe right → MOVE TO DECK (green)
  - `handleMoveToMaybe(card)` and `handleMoveToPile(card)` added
  - WREC section rebuilt in sticky header: `computeWrecScore()` batting-average formula (symmetric over/under penalty); 28px score number colored green/yellow/red; 6 colored segment chips with count/target; "WREC SCORE" underline button opens info bottom sheet
  - WREC info sheet: methodology explanation + per-category rows with targets and descriptions
  - All WREC values derived fresh from `pile` + `wrecTags` props on every render (no stale state)
  - Grid view unchanged

- ✅ **SwipeScreen tactile physics, haptics, card indicators** (2026-05-19)
  - Swipe physics: card follows finger via `translateX(offset) rotate(offset*0.08, ±15deg cap)`; threshold raised 60→80px; fly-out animates to `±110vw rotate(±30deg)` over 280ms ease-in; spring-back on release below threshold via `cubic-bezier(0.34, 1.56, 0.64, 1) 300ms`
  - Drag tint overlay: green (#6BFF9E) on right drag, red (#FF6B6B) on left; opacity 0→0.35 from 20px to 80px offset
  - Haptics: `getSettings().haptics` gating + try/catch wrapping all `navigator.vibrate` calls (iOS Safari safe)
  - Commander-legal gold border: `card.legalities.commander === "legal"` → inset overlay with `border: 2px solid #FFD700` + `box-shadow: 0 0 8px rgba(255,215,0,0.5)`
  - Game Changer: `card.game_changer === true` → pulsing `gc-glow` keyframe injected once into `document.head` + glow overlay + lightning bolt SVG badge (#00cfff) at top-left

- ✅ **Claude API Edge Function proxy** (2026-05-19)
  - `api/translate.js` — Vercel Edge Function; accepts `POST { input, commanderName }`; reads `ANTHROPIC_API_KEY` from `process.env` (server-side only); returns `{ query }` or `{ query: input }` fallback; CORS header added for local dev
  - `src/lib/nlp.js` — replaced direct Anthropic fetch with `POST /api/translate`; `VITE_ANTHROPIC_API_KEY` removed from all live src/ code
  - `.env.local` — replaced `VITE_ANTHROPIC_API_KEY=` with `ANTHROPIC_API_KEY=your-key-here` (server-side); also needs to be set in Vercel project env vars

- ✅ **NLP → Claude API + SearchScreen rebuild** (2026-05-19)
  - `src/lib/nlp.js` replaced with async `translateToScryfall(input)` — calls `claude-sonnet-4-20250514` via `api.anthropic.com/v1/messages`, falls back to raw input on error; reads `VITE_ANTHROPIC_API_KEY`
  - `src/screens/SearchScreen.jsx` rebuilt: single "SEARCH YOUR STACK" input, NLP/raw query toggle link (reads/writes `cardstock_settings.rawQueryMode`), SEARCH pill button, "THINKING…" spinner during Claude API call, full/short card fan animation overlay (reads `cardstock_settings.fullLoadingAnimation`), history navigation preserved
  - `hasSearchedThisSession` module-level flag gates full (2s) vs short (400ms) animation
  - Removed live translated query preview (incompatible with async API)

- ✅ **Settings screen** (2026-05-19)
  - `src/lib/settings.js` — `getSettings()`, `updateSetting(key, val)`, `DEFAULT_SETTINGS`; persists to `cardstock_settings` in localStorage
  - `src/screens/SettingsScreen.jsx` — four toggles in two sections (SWIPE EXPERIENCE: haptics, swipeAnimations; SEARCH: fullLoadingAnimation, rawQueryMode); inline pill toggles, no save button, back → brews
  - `App.jsx` — imports SettingsScreen, renders on `screen === "settings"`, passes `onOpenSettings` to BrewsScreen
  - `BrewsScreen.jsx` — added `onOpenSettings` prop + gear icon button (44×44 touch target) in header top-right

- ✅ **NNG Mobile UX Redesign** (2026-05-18)
  - Swipe gesture labels: opacity-driven KEEP/PASS labels (onset at 20px offset), correctly positioned left=KEEP/right=PASS, fade on release
  - Touch targets: PileScreen row remove (44×44), grid card remove (wrapper pattern, visual unchanged), list/grid toggle + COPY (minHeight 44)
  - Pipeline indicator: `PipelineIndicator.jsx` (shared component), rendered in App.jsx fixed below header for swipe/pile/maybe screens
  - Card content hierarchy: SwipeScreen primary = name+mana only; single-tap expands type, oracle text, P/T; double-tap still triggers WREC tag
  - Header audit: PileScreen header already 52px, no changes needed
  - First-run swipe hint: full "HOW TO SWIPE" modal replaced with subtle animated `← →` arrow; new flag `ds_swipe_hint_shown`; dismissed on first completed swipe

- ✅ **NLP translator + Anthropic removal** (2026-05-18)
  - Replaced Anthropic API brew pipeline with synchronous `translateToScryfall()` from `src/lib/nlp.js`
  - Added archetype vocabulary (blink, aggro, turbo, stax, voltron, aristocrats, tokens, reanimate, wheels) + safety fallback (query < 4 chars → `name:${raw}`)
  - Fixed `oracletag:` → `otag:` (6 occurrences in nlp.js)
  - Added terminal-style search history (ArrowUp/Down, max 10, deduped, `ds_search_history` key)
  - Live translated query preview shown as mono subtitle

- ✅ **Natural language brew prompt** (2026-05-17)
  - `src/services/brewPrompt.js` and `validateBrewQuery.js` exist as dead code (no longer imported)

---

## Known Issues

- Settings values not yet consumed — `haptics`, `swipeAnimations`, `fullLoadingAnimation`, `rawQueryMode` are stored but nothing reads them from `getSettings()` at runtime
- `_deckCategory` never set on swiped or imported cards → WREC end-to-end broken (pre-existing)
- `DeckReviewPill.jsx` existence — verify whether rendered in current App.jsx (pre-existing)
- `src/services/brewPrompt.js` and `src/services/validateBrewQuery.js` — dead code, candidate for deletion
