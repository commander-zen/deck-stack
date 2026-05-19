export async function translateToScryfall(input) {
  const raw = input.trim();
  if (!raw) return "";

  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: raw, commanderName: null }),
    });

    if (!res.ok) throw new Error(`translate ${res.status}`);
    const { query } = await res.json();
    return query;
  } catch (err) {
    console.warn("translateToScryfall fallback:", err);
    return raw;
  }
}
