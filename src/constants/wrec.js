export const WREC_TARGETS = {
  Ramp: 10,
  "Card Advantage": 12,
  Disruption: 12,
  "Mass Disruption": 6,
  "Mana Base": 38,
  Plan: 30,
};

export const WREC_CATEGORIES = Object.keys(WREC_TARGETS);

// Veggie qualification rules — anchor + at least one qualifier
export const VEGGIE_RULES = {
  Ramp: {
    anchor: "ramp",
    qualifiers: ["mana-rock", "land-ramp", "land-tutor", "mana-dork", "mana-acceleration"],
  },
  "Card Advantage": {
    anchor: "card-draw",
    qualifiers: ["draw-engine", "life-for-cards", "draw-1", "draw-x", "tutor"],
  },
  Disruption: {
    anchor: "interaction",
    qualifiers: ["removal", "counterspell", "exile-removal", "destroy-removal", "creature-removal"],
  },
  "Mass Disruption": {
    anchor: "board-wipe",
    qualifiers: ["mass-removal", "destroy-all", "mass-damage"],
  },
};

// Oracle tags not available from /cards/collection — detection uses oracle_text heuristics

export function autoDetectCategory(card) {
  // Mana Base: type_line check (reliable)
  if (card.type_line?.toLowerCase().includes("land")) return "Mana Base";

  const text     = (card.oracle_text ?? "").toLowerCase();
  const typeLine = (card.type_line ?? "").toLowerCase();

  // Ramp — "add" + mana symbol or "mana" on a non-land permanent or spell
  if (
    text.includes("add") && (text.includes("mana") || text.includes("{")) &&
    (typeLine.includes("artifact") || typeLine.includes("creature") ||
     typeLine.includes("enchantment") || typeLine.includes("sorcery") ||
     typeLine.includes("instant"))
  ) return "Ramp";

  // Card Advantage
  if (text.includes("draw") && (text.includes("card") || text.includes("cards"))) {
    return "Card Advantage";
  }

  // Mass Disruption — check before Disruption (more specific)
  if (
    text.includes("destroy all") || text.includes("exile all") ||
    text.includes("each creature") || text.includes("all creatures")
  ) return "Mass Disruption";

  // Disruption
  if (
    text.includes("destroy target") || text.includes("exile target") ||
    text.includes("counter target") || text.includes("counter spell")
  ) return "Disruption";

  return null;
}

export function calcWrecScore(wrecTags) {
  const ratios = WREC_CATEGORIES.map(cat => {
    const count  = (wrecTags[cat] ?? []).length;
    const target = WREC_TARGETS[cat];
    return count / target;
  });
  const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  return avg.toFixed(3); // "0.842" batting average style
}
