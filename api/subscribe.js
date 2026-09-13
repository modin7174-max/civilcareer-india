export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, phone, preference } = req.body

  const response = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/subscribers`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ email, phone, preference })
    }
  )

  if (!response.ok) {
    const err = await response.text()
    return res.status(500).json({ error: err })
  }

  return res.status(200).json({ success: true })
}