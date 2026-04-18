// api/kv.js
// Serverless function — bridges the game frontend to Upstash Redis via REST API
// Required env vars in Vercel:
//   UPSTASH_REDIS_REST_URL    e.g. https://xxxx.upstash.io
//   UPSTASH_REDIS_REST_TOKEN  e.g. AXxxxx...

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return res.status(500).json({ error: 'Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN' });
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // ── GET /api/kv?key=ww_ROOMID ─────────────────────────────────────────────
  if (req.method === 'GET') {
    const { key } = req.query;
    if (!key) return res.status(400).json({ error: 'Missing key' });

    try {
      const r = await fetch(`${url}/get/${encodeURIComponent(key)}`, { headers });
      const json = await r.json();
      // Upstash returns { result: "stringified JSON" } or { result: null }
      return res.status(200).json({ value: json.result ?? null });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ── POST /api/kv  { key, value } ──────────────────────────────────────────
  if (req.method === 'POST') {
    const { key, value } = req.body || {};
    if (!key) return res.status(400).json({ error: 'Missing key' });

    try {
      // SET key value EX 86400  (auto-expire rooms after 24 hours)
      const r = await fetch(`${url}/set/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ value, ex: 86400 }),
      });
      const json = await r.json();
      if (json.result !== 'OK') return res.status(500).json({ error: json });
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
