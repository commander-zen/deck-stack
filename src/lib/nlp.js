export async function translateToScryfall(input, commanderCard = null) {
  const raw = input.trim();
  if (!raw) return "";

  try {
    const res = await fetch("https://zmzkfnljvusrqcvwuvgc.supabase.co/functions/v1/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: raw,
        commanderName:  commanderCard?.name ?? null,
        colorIdentity:  commanderCard?.color_identity ?? null,
      }),
    });

    if (!res.ok) throw new Error(`translate ${res.status}`);
    const { query } = await res.json();
    return query;
  } catch (err) {
    console.warn("translateToScryfall fallback:", err);
    return raw;
  }
}
