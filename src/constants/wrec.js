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

// Lands: type-based, not oracle tag based
// Plan: commander-derived, TBD

export function autoDetectCategory(card) {
  // Lands check first
  if (card.type_line?.toLowerCase().includes("land")) return "Mana Base";

  const tags = card.oracle_tags ?? card.keywords ?? [];
  for (const [category, rule] of Object.entries(VEGGIE_RULES)) {
    if (tags.includes(rule.anchor) && rule.qualifiers.some(q => tags.includes(q))) {
      return category;
    }
  }
  return null; // no match
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
