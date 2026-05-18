# SESSION STATE — deck-swipe

## Cold Start Prompt
Next: Add `VITE_ANTHROPIC_API_KEY` to `.env.local` with a real Anthropic API key, then test the brew prompt flow end-to-end.

---

## Completed ✅

- ✅ **NNG Mobile UX Redesign** (2026-05-18)
  - Swipe gesture labels: opacity-driven KEEP/PASS labels (onset at 20px offset), correctly positioned left=KEEP/right=PASS, fade on release
  - Touch targets: PileScreen row remove (44×44), grid card remove (wrapper pattern, visual unchanged), list/grid toggle + COPY (minHeight 44)
  - Pipeline indicator: `PipelineIndicator.jsx` (shared component), rendered in App.jsx fixed below header for swipe/pile/maybe screens
  - Card content hierarchy: SwipeScreen primary = name+mana only; single-tap expands type, oracle text, P/T; double-tap still triggers WREC tag
  - Header audit: PileScreen header already 52px, no changes needed
  - First-run swipe hint: full "HOW TO SWIPE" modal replaced with subtle animated `← →` arrow; new flag `ds_swipe_hint_shown`; dismissed on first completed swipe

- ✅ **Natural language brew prompt** (2026-05-17)
  - Created `src/services/brewPrompt.js` — calls Claude Haiku via Anthropic API, returns Scryfall query string
  - Created `src/services/validateBrewQuery.js` — validates query against Scryfall, shuffles/returns 22 cards or null
  - Replaced NLP search input in `SearchScreen.jsx` with brew prompt input
  - Rotating placeholder array on mount and on clear
  - Loading state: placeholder = "finding your cards...", input locked, no spinner
  - Error state: placeholder resets after 3s on Scryfall failure
  - Removed `lib/nlp.js` usage from SearchScreen (file still exists, no longer imported)
  - Requires `VITE_ANTHROPIC_API_KEY` in `.env.local` — placeholder key added, needs real value

---

## Known Issues

- `VITE_ANTHROPIC_API_KEY` in `.env.local` is empty — brew prompt will fail until populated
- `src/lib/nlp.js` is now dead code — not imported anywhere, candidate for deletion
- `_deckCategory` never set on swiped or imported cards → WREC end-to-end broken (pre-existing)
- `DeckReviewPill.jsx` existence — verify whether rendered in current App.jsx (pre-existing)
