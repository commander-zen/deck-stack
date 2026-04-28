export default async function handler(req, res) {
  const { id } = req.query;
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) {
    return res.status(400).json({ error: "Invalid deck id" });
  }
  const url = `https://api2.moxfield.com/v3/decks/all/${id}`;
  console.log("[moxfield proxy] fetching:", url);
  try {
    const upstream = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DeckStack/1.0)",
        "Accept": "application/json",
      },
    });
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Moxfield returned ${upstream.status}` });
    }
    const data = await upstream.json();
    console.log("[moxfield proxy] response top-level keys:", Object.keys(data));
    console.log("[moxfield proxy] board keys:", Object.keys(data.boards ?? {}));
    res.setHeader("Cache-Control", "public, s-maxage=300");
    return res.status(200).json(data);
  } catch (err) {
    console.error("[moxfield proxy] fetch failed:", err);
    return res.status(502).json({ error: "Failed to reach Moxfield" });
  }
}
