// api/kv.js
// Vercel serverless function — bridges the frontend to Vercel KV (Redis)

export default async function handler(req, res) {
  const kvUrl   = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  if (!kvUrl || !kvToken) {
    return res.status(500).json({ error: 'KV env vars not configured' });
  }

  // ── GET  /api/kv?action=get&key=ww_ROOMID ──────────────────────────────────
  if (req.method === 'GET') {
    const { key } = req.query;
    if (!key) return res.status(400).json({ error: 'Missing key' });

    const r = await fetch(`${kvUrl}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${kvToken}` },
    });
    const json = await r.json();
    // Vercel KV REST returns { result: "value" } or { result: null }
    return res.status(200).json({ value: json.result ?? null });
  }

  // ── POST /api/kv  { action:"set", key, value } ─────────────────────────────
  if (req.method === 'POST') {
    const { action, key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'Missing key' });

    if (action === 'set') {
      // Store with 24-hour expiry (86400 seconds) so stale rooms self-clean
      const r = await fetch(`${kvUrl}/set/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${kvToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value, ex: 86400 }),
      });
      const json = await r.json();
      return res.status(200).json({ ok: json.result === 'OK' });
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
