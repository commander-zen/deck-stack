export const config = { runtime: "nodejs" };

export default async function handler(req) {
  const start = Date.now();
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 10,
        messages: [{ role: "user", content: "say hi" }],
      }),
    });
    const data = await res.json();
    return new Response(JSON.stringify({ ok: res.ok, status: res.status, elapsed: Date.now() - start, data }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, elapsed: Date.now() - start }), { status: 200 });
  }
}
