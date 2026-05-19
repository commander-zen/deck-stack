export async function translateToScryfall(input) {
  const raw = input.trim();
  if (!raw) return "";

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 200,
        system: "You are a Magic: The Gathering card search expert. Convert the user's natural language request into a valid Scryfall search query. Always include f:commander. Return ONLY the raw Scryfall query string — no explanation, no markdown, no quotes.",
        messages: [{ role: "user", content: raw }],
      }),
    });

    if (!response.ok) throw new Error(`API ${response.status}`);
    const data = await response.json();
    return data.content[0].text.trim();
  } catch (err) {
    console.warn("translateToScryfall fallback:", err);
    return raw;
  }
}
