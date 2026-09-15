/**
 * CivilCareer — Job Interactions API
 * Save / Ignore / Apply / Track status
 */
const SUPA = process.env.SUPABASE_URL;
const KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

function supa(path, opts = {}) {
  return fetch(`${SUPA}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: KEY, Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json', Prefer: 'return=representation',
      ...opts.headers,
    },
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-session-id');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sessionId = req.headers['x-session-id'];
  if (!sessionId) return res.status(400).json({ error: 'Missing session ID' });

  // GET — list all interactions for session
  if (req.method === 'GET') {
    const action = req.query?.action;
    const query = action
      ? `job_interactions?session_id=eq.${encodeURIComponent(sessionId)}&action=eq.${action}&order=created_at.desc`
      : `job_interactions?session_id=eq.${encodeURIComponent(sessionId)}&order=created_at.desc`;
    const r = await supa(query);
    if (!r.ok) return res.status(500).json({ error: 'Failed to load' });
    return res.status(200).json({ interactions: await r.json() });
  }

  // POST — save/ignore/apply/update status
  if (req.method === 'POST') {
    let body = req.body || {};
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch(e) { body = {}; } }
    const { job_id, action, notes } = body;
    if (!job_id || !action) return res.status(400).json({ error: 'Missing job_id or action' });

    const r = await supa('job_interactions', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({ session_id: sessionId, job_id, action, notes: notes || null,
        created_at: new Date().toISOString() })
    });
    if (!r.ok) { const e = await r.text(); return res.status(500).json({ error: e }); }
    const data = await r.json();
    return res.status(200).json({ success: true, interaction: Array.isArray(data) ? data[0] : data });
  }

  // DELETE — remove interaction
  if (req.method === 'DELETE') {
    let body = req.body || {};
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch(e) { body = {}; } }
    const { job_id } = body;
    if (!job_id) return res.status(400).json({ error: 'Missing job_id' });
    const r = await supa(
      `job_interactions?session_id=eq.${encodeURIComponent(sessionId)}&job_id=eq.${job_id}`,
      { method: 'DELETE' }
    );
    if (!r.ok) return res.status(500).json({ error: 'Delete failed' });
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
