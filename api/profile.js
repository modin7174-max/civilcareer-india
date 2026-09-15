/**
 * CivilCareer — User Profile + Preferences API
 * GET/PUT /api/profile
 * Uses anonymous session_id (stored in user's localStorage)
 */
const SUPA = process.env.SUPABASE_URL;
const KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-session-id');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sessionId = req.headers['x-session-id'];
  if (!sessionId) return res.status(400).json({ error: 'Missing session ID' });

  // ── GET profile + preferences ──────────────────────────────────────
  if (req.method === 'GET') {
    const [pr, pf] = await Promise.all([
      supa(`user_profiles?session_id=eq.${encodeURIComponent(sessionId)}&limit=1`),
      supa(`job_preferences?session_id=eq.${encodeURIComponent(sessionId)}&limit=1`)
    ]);
    const profiles = pr.ok ? await pr.json() : [];
    const prefs    = pf.ok ? await pf.json() : [];
    return res.status(200).json({
      profile: profiles[0] || null,
      preferences: prefs[0] || null
    });
  }

  // ── PUT/POST — upsert profile + preferences ────────────────────────
  if (req.method === 'PUT' || req.method === 'POST') {
    let body = req.body || {};
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch(e) { body = {}; } }

    const { profile = {}, preferences = {} } = body;
    const now = new Date().toISOString();

    // Upsert profile
    const profileData = { ...profile, session_id: sessionId, updated_at: now };
    const pr = await supa('user_profiles', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(profileData)
    });

    // Upsert preferences
    const prefData = { ...preferences, session_id: sessionId, updated_at: now };
    const pf = await supa('job_preferences', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(prefData)
    });

    if (!pr.ok || !pf.ok) {
      const e = !pr.ok ? await pr.text() : await pf.text();
      return res.status(500).json({ error: e });
    }

    const savedProfile = await pr.json();
    const savedPrefs   = await pf.json();
    return res.status(200).json({
      success: true,
      profile: Array.isArray(savedProfile) ? savedProfile[0] : savedProfile,
      preferences: Array.isArray(savedPrefs) ? savedPrefs[0] : savedPrefs
    });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
