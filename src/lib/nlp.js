/**
 * Rule-based NLP → Scryfall syntax translator.
 * No external API — pure regex/string matching.
 *
 * Pass-through: if input contains `:` or `"`, returns it unchanged.
 * Returns: { query: string, translated: boolean, displayQuery: string }
 */
export function translateToScryfall(input) {
  const raw = input.trim();
  if (!raw) return { query: '', translated: false, displayQuery: '' };

  // Already Scryfall syntax — pass through untouched
  if (raw.includes(':') || raw.includes('"')) {
    return { query: raw, translated: false, displayQuery: raw };
  }

  const t = raw.toLowerCase();
  const parts = [];

  // ── CMC ────────────────────────────────────────────────────────────────────
  const cmcNum = t.match(/\bcosts?\s+(\d+)(?:\s+mana)?\b|\b(\d+)[\s-]mana(?:\s+cost)?\b|\bcmc\s*[=:]\s*(\d+)\b/);
  if (cmcNum) {
    parts.push(`cmc=${cmcNum[1] ?? cmcNum[2] ?? cmcNum[3]}`);
  } else if (/\bfree\b|\bcosts?\s+nothing\b/.test(t)) {
    parts.push('cmc=0');
  } else if (/\bcheap\b|\blow[\s-]cost\b|\blow[\s-]mana\b|\binexpensive\b/.test(t)) {
    parts.push('cmc<=2');
  } else if (/\bexpensive\b|\bhigh[\s-]cost\b|\bhigh[\s-]mana\b/.test(t)) {
    parts.push('cmc>=5');
  }

  // ── Negated types (collected first to prevent double-adding) ───────────────
  const negTypes = new Set();
  if (/\bnot\s+a?\s*creatures?\b|\bno\s+creatures?\b/.test(t))   negTypes.add('creature');
  if (/\bnot\s+a?\s*lands?\b|\bno\s+lands?\b/.test(t))           negTypes.add('land');
  if (/\bnot\s+an?\s*artifacts?\b|\bno\s+artifacts?\b/.test(t))  negTypes.add('artifact');
  if (/\bnot\s+an?\s*enchantments?\b/.test(t))                   negTypes.add('enchantment');
  for (const type of negTypes) parts.push(`-t:${type}`);

  // ── Positive types ─────────────────────────────────────────────────────────
  const TYPE_MAP = [
    [/\blegendary\b/,                   't:legendary'],
    [/\bcreatures?\b/,                  't:creature'],
    [/\binstants?\b/,                   't:instant'],
    [/\bsorcery\b|\bsorceries\b/,       't:sorcery'],
    [/\benchantments?\b/,               't:enchantment'],
    [/\bartifacts?\b/,                  't:artifact'],
    [/\blands?\b/,                      't:land'],
    [/\bplaneswalkers?\b/,              't:planeswalker'],
  ];
  for (const [re, clause] of TYPE_MAP) {
    if (re.test(t)) {
      const baseType = clause.replace('t:', '');
      if (!negTypes.has(baseType)) parts.push(clause);
    }
  }

  // ── Functions ──────────────────────────────────────────────────────────────
  if (/\bramp\b|\bmana\s+acceler/.test(t))
    parts.push('otag:ramp');

  if (/\bcard[\s-]draw\b|\bdraw(?:ing)?\s+cards?\b|\bcard\s+advantage\b/.test(t))
    parts.push('otag:card-draw');

  if (/\btargeted?\s+removal\b|\bspot\s+removal\b/.test(t))
    parts.push('otag:removal');
  else if (/\bremoval\b|\bkill(?:ing)?\b|\bdestroy(?:ing)?\b|\bexile(?:s|ing)?\b/.test(t) && !/\bself/.test(t))
    parts.push('otag:removal');

  if (/\bwipe\b|\bboard[\s-]?wipe\b|\bsweeper\b|\bmass\s+removal\b|\bwrath\b/.test(t))
    parts.push('otag:wrath');

  if (/\bcounterspell\b|\bcounter[\s-]spell\b/.test(t)) {
    parts.push('t:instant', 'o:counter');
  } else if (/\bcounters?\s+target\b/.test(t)) {
    parts.push('o:"counter target"');
  }

  if (/\btutor\b|\bsearch\s+(?:your|the)\s+library\b/.test(t))
    parts.push('otag:tutor');

  // ── Keywords ───────────────────────────────────────────────────────────────
  // Each entry: [posRe, clause, negRe | null]
  const KW_MAP = [
    [/\bflying\b/,      'o:flying',        /\bwithout\s+flying\b|\bnon-flying\b/],
    [/\bhaste\b/,       'o:haste',         null],
    [/\btrample\b/,     'o:trample',       null],
    [/\bflash\b/,       'o:flash',         null],
    [/\bvigilance\b/,   'o:vigilance',     null],
    [/\bdeathtouch\b/,  'o:deathtouch',    null],
    [/\blifelink\b/,    'o:lifelink',      null],
    [/\bmenace\b/,      'o:menace',        null],
    [/\btoken(?:s)?\b/, 'o:token',         null],
    [/\blifegain\b|\bgain(?:ing)?\s+life\b/, 'o:"gain life"', null],
  ];
  for (const [posRe, clause, negRe] of KW_MAP) {
    if (negRe && negRe.test(t)) {
      parts.push(`-${clause}`);
    } else if (posRe.test(t) && !parts.includes(clause)) {
      parts.push(clause);
    }
  }

  // ── Colors ─────────────────────────────────────────────────────────────────
  const COLOR_MAP = [
    ['white', 'c:w'], ['blue', 'c:u'], ['black', 'c:b'],
    ['red',   'c:r'], ['green', 'c:g'], ['colorless', 'c:c'],
  ];
  for (const [name, clause] of COLOR_MAP) {
    const negRe = new RegExp(`\\b(?:not|without|that\\s+isn'?t)\\s+${name}\\b`);
    const posRe = new RegExp(`\\b${name}\\b`);
    if (negRe.test(t))       parts.push(`-${clause}`);
    else if (posRe.test(t))  parts.push(clause);
  }
  if (/\bmulticolou?r(?:ed)?\b/.test(t)) parts.push('c>=2');

  // ── Archetypes / strategies ───────────────────────────────────────────────
  // "turbo" alone is too vague; as an intensifier it lowers the CMC floor already
  // set by another archetype term. Track whether a CMC clause was added above.
  const hasCmcClause = parts.some(p => p.startsWith('cmc'));

  if (/\bturbo\b/.test(t) && !hasCmcClause) {
    // Intensifier with no other CMC constraint → push a low-CMC floor
    parts.push('cmc<=2');
  }

  if (/\bblink\b|\bflicker\b/.test(t))
    parts.push('o:exile', 'o:return');

  if (/\baggro\b/.test(t) && !hasCmcClause)
    parts.push('cmc<=3', 't:creature');

  // "combo" has no reliable Scryfall mapping — skip, let fallback name-match

  if (/\bcontrol\b/.test(t))
    parts.push('o:counter', 'o:destroy');

  if (/\bstax\b/.test(t))
    parts.push('o:"can\'t untap"', 'o:"opponents can\'t"');

  if (/\bvoltron\b/.test(t))
    parts.push('o:equip', 'o:attach');

  if (/\baristocrats?\b/.test(t))
    parts.push('o:sacrifice', 'o:"whenever a creature dies"');

  if (/\btokens?\s+(?:strategy|deck|theme|focus)?\b/.test(t) && !parts.includes('o:token'))
    parts.push('o:"create a"', 'o:token');

  if (/\breanimat(?:e|or|ing|ion)\b/.test(t))
    parts.push('o:"return target creature card from your graveyard"');

  if (/\bwheels?\b|\bwheel\s+effects?\b/.test(t))
    parts.push('o:"each player discards"');

  // ── Fallback: treat as card name search ────────────────────────────────────
  if (parts.length === 0) {
    const q = `name:${raw}`;
    return { query: q, translated: true, displayQuery: q };
  }

  const query = [...new Set(parts)].join(' ');

  // Safety net: if the assembled query is suspiciously short or empty, fall back
  // to a name search so the user gets results instead of a blank swipe screen.
  if (query.length < 4) {
    const q = `name:${raw}`;
    return { query: q, translated: true, displayQuery: q };
  }

  return { query, translated: true, displayQuery: query };
}
