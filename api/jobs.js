/**
 * CivilCareer — Jobs API
 * File: api/jobs.js
 * Handles GET (public) + POST/PATCH/DELETE (admin)
 */
const SUPA = process.env.SUPABASE_URL;
const KEY  = process.env.SUPABASE_SERVICE_KEY;

function supa(path, opts={}) {
  return fetch(`${SUPA}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Prefer: opts.method === 'POST' ? 'return=representation' : 'return=minimal',
      ...opts.headers
    }
  });
}

export default async function handler(req, res) {
  // ── GET — public job listing ───────────────────────────────────────
  if (req.method === 'GET') {
    const r = await supa('jobs?published=eq.true&order=created_at.desc');
    if (!r.ok) return res.status(500).json({ error: 'Failed to load jobs' });
    const jobs = await r.json();
    return res.status(200).json({ jobs });
  }

  // ── Auth check for write operations ───────────────────────────────
  const key = req.headers['x-owner-key'] || req.body?.key;
  if (key !== process.env.OWNER_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // ── POST — create job ──────────────────────────────────────────────
  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    delete body.id;
    body.published = true;
    if (!body.status) body.status = 'Active';
    const r = await supa('jobs', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(body)
    });
    if (!r.ok) {
      const err = await r.text();
      return res.status(500).json({ error: err });
    }
    const data = await r.json();
    return res.status(201).json({ job: data[0] });
  }

  // ── PATCH — update job ─────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { id, ...rest } = body;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const r = await supa(`jobs?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(rest)
    });
    if (!r.ok) return res.status(500).json({ error: 'Update failed' });
    return res.status(200).json({ success: true });
  }

  // ── DELETE ─────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const r = await supa(`jobs?id=eq.${id}`, { method: 'DELETE' });
    if (!r.ok) return res.status(500).json({ error: 'Delete failed' });
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
