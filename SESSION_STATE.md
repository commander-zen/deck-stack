# SESSION STATE — deck-swipe

## Cold Start Prompt
Next: Test PileScreen swipe gestures on device — verify CUT/CONSIDER/REMOVE/MOVE TO DECK actions, spring-back on sub-threshold release, and haptic feedback. Also test WREC score reactivity as cards are added/removed.

---

## Completed ✅

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
