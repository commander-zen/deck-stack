export const config = { runtime: "nodejs" };

const CORS = { "Access-Control-Allow-Origin": "*" };

function buildSystemPrompt(commanderName, colorIdentity) {
  const colorStr = colorIdentity?.length ? colorIdentity.join("") : null;
  const hasBlue  = colorIdentity?.includes("U");
  const hasGreen = colorIdentity?.includes("G");
  const hasBlack = colorIdentity?.includes("B");

  const commanderLine = commanderName
    ? `Active commander: ${commanderName} (color identity: ${colorStr ?? "unknown"})`
    : "No commander set — omit color identity filter unless the user specifies colors.";

  const countersGuidance = (hasGreen || hasBlack) && !hasBlue
    ? 'Default to +1/+1 counter synergies (o:"+1/+1").'
    : hasBlue && !hasGreen && !hasBlack
    ? "Default to counterspells (o:\"counter target\")."
    : 'If "counters" is ambiguous: prefer +1/+1 counter synergies unless context implies spells.';

  return `You are a Scryfall search expert for Magic: The Gathering Commander. Convert the user's natural language request into a single valid Scryfall search query string.

${commanderLine}

STRICT OUTPUT RULES:
- Return ONLY the raw Scryfall query string. No explanation, no markdown, no quotes, no prose.
- Always include f:commander unless the user explicitly asks for non-Commander-legal cards.
- Always append -type:sticker -type:attraction to every query.
- For color identity use id: syntax (e.g. id:BG), never id<= or id>=.
${colorStr ? `- Apply color identity filter: id:${colorStr}` : ""}

COMMANDER VOCABULARY — interpret these correctly:
- "ramp" = mana acceleration: land-fetching spells, mana rocks, mana dorks, cost reducers. NOT a creature named Ramp.
- "counters" = ${countersGuidance}
- "protection" = cards granting hexproof, shroud, indestructible, or ward (not just keyword "protection from").
- "wipes" / "board clear" / "board wipe" = mass removal: o:"destroy all" or o:"exile all" or o:"each creature gets".
- "draw" / "gas" / "card advantage" = draw spells, cantrips, ETB draw triggers (o:"draw" o:"card").
- "removal" = targeted removal: o:"destroy target" or o:"exile target".
- "tutors" = library search effects: o:"search your library".
- "recursion" = graveyard recursion: o:"from your graveyard".
- "stax" = resource denial / tax effects.
- "wheels" = mass hand discard and redraw (e.g. Wheel of Fortune effects).`;
}

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { ...CORS, "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type" } });
  }

  let input = "", commanderName = null, colorIdentity = null;
  try {
    const body = await req.json();
    input         = (body.input ?? "").trim();
    commanderName = body.commanderName ?? null;
    colorIdentity = Array.isArray(body.colorIdentity) ? body.colorIdentity : null;
    console.log("[translate] request body:", { input, commanderName, colorIdentity });
  } catch {
    return new Response(JSON.stringify({ query: "" }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
  }

  if (!input) {
    return new Response(JSON.stringify({ query: "" }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        system: buildSystemPrompt(commanderName, colorIdentity),
        messages: [{ role: "user", content: input }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.log("[translate] Anthropic error status:", response.status, "body:", errBody);
      throw new Error(`Anthropic ${response.status}: ${errBody}`);
    }
    const data = await response.json();
    console.log("[translate] raw haiku response:", JSON.stringify(data.content));
    const query = data.content[0].text.trim();
    console.log("[translate] anthropic response:", JSON.stringify(data));
    console.log("[translate] returning query:", query);
    return new Response(JSON.stringify({ query }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (err) {
    console.log("[translate] CAUGHT ERROR:", err?.message ?? String(err));
    console.log("[translate] CAUGHT ERROR status:", err?.status ?? "none");
    return new Response(JSON.stringify({ query: input, error: err?.message ?? String(err) }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
  }
}
