export const config = { runtime: "edge" };

const CORS = { "Access-Control-Allow-Origin": "*" };

const SYSTEM_PROMPT =
  "You are a Magic: The Gathering card search expert. Convert the user's natural language request into a valid Scryfall search query. Always include f:commander. Return ONLY the raw Scryfall query string — no explanation, no markdown, no quotes.";

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { ...CORS, "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type" } });
  }

  let input = "";
  try {
    const body = await req.json();
    input = (body.input ?? "").trim();
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
        model: "claude-sonnet-4-20250514",
        max_tokens: 200,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: input }],
      }),
    });

    if (!response.ok) throw new Error(`Anthropic ${response.status}`);
    const data = await response.json();
    const query = data.content[0].text.trim();
    return new Response(JSON.stringify({ query }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("translate edge fn error:", err);
    return new Response(JSON.stringify({ query: input }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
  }
}
