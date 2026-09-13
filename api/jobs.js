/**
 * CivilCareer — Jobs API  v2 (fixed)
 * Fixes: wrong env var name, ES module syntax, admin visibility
 */
const SUPA = process.env.SUPABASE_URL;
const KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;   // ← FIXED (was SUPABASE_SERVICE_KEY)

function supa(path, opts = {}) {
  return fetch(`${SUPA}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...opts.headers,
    },
  });
}

function getKey(req) {
  return req.headers['x-owner-key'] || '';
}

function isAdmin(req) {
  return getKey(req) === process.env.OWNER_KEY;
}

// ← FIXED: module.exports instead of export default
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-owner-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET ─────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    // ← FIXED: admin sees ALL jobs, public sees only published
    const query = isAdmin(req)
      ? 'jobs?order=created_at.desc'
      : 'jobs?published=eq.true&order=created_at.desc';

    const r = await supa(query);
    if (!r.ok) {
      const e = await r.text();
      return res.status(500).json({ error: 'Failed to load jobs', detail: e });
    }
    const jobs = await r.json();
    return res.status(200).json({ jobs });
  }

  // ── Auth required for writes ─────────────────────────────────────────
  if (!isAdmin(req)) {
    return res.status(401).json({ error: 'Invalid owner key' });
  }

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }

  // ── POST — create job ────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { id, key, ...rest } = body;
    rest.published = true;
    if (!rest.status) rest.status = 'Active';
    rest.created_at = rest.created_at || new Date().toISOString();

    const r = await supa('jobs', { method: 'POST', body: JSON.stringify(rest) });
    if (!r.ok) {
      const e = await r.text();
      return res.status(500).json({ error: e });
    }
    const data = await r.json();
    return res.status(201).json({ job: Array.isArray(data) ? data[0] : data, success: true });
  }

  // ── PATCH — update job ───────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const { id, key, ...rest } = body;
    if (!id) return res.status(400).json({ error: 'Missing id' });

    const r = await supa(`jobs?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(rest),
    });
    if (!r.ok) {
      const e = await r.text();
      return res.status(500).json({ error: e });
    }
    return res.status(200).json({ success: true });
  }

  // ── DELETE ───────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { id } = body;
    if (!id) return res.status(400).json({ error: 'Missing id' });

    const r = await supa(`jobs?id=eq.${id}`, { method: 'DELETE' });
    if (!r.ok) {
      const e = await r.text();
      return res.status(500).json({ error: e });
    }
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
