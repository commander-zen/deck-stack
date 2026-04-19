export default async function handler(req, res) {
  const { id } = req.query;
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) {
    return res.status(400).json({ error: "Invalid deck id" });
  }
  try {
    const upstream = await fetch(`https://api.moxfield.com/v2/decks/all/${id}`, {
      headers: {
        "User-Agent": "DeckStack/1.0 (deck-stack.vercel.app)",
        "Accept": "application/json",
      },
    });
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Moxfield returned ${upstream.status}` });
    }
    const data = await upstream.json();
    res.setHeader("Cache-Control", "public, s-maxage=300");
    return res.status(200).json(data);
  } catch {
    return res.status(502).json({ error: "Failed to reach Moxfield" });
  }
}
