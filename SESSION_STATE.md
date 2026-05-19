# SESSION STATE — deck-swipe

## Cold Start Prompt
Next: Add `VITE_ANTHROPIC_API_KEY` to `.env.local` with a real Anthropic API key — the NLP brew pipeline now calls Claude API and will fall back to raw input without a key.

---

## Completed ✅

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
