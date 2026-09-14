const AFCONS_JOB_URL =
  'https://careers.afcons.com/job/India-SITE-ENGINEER-URBAN-Any/58071744/';

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Fetch the Afcons vacancy
    const response = await fetch(AFCONS_JOB_URL);

    if (!response.ok) {
      return res.status(502).json({
        error: 'Could not fetch Afcons job page',
        status: response.status
      });
    }

    const html = await response.text();
    const text = htmlToText(html);

    // 2. Send the vacancy text to CivilCareer's existing extractor
    const origin =
      `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;

    const extractResponse = await fetch(`${origin}/api/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-owner-key': process.env.OWNER_KEY
      },
      body: JSON.stringify({
        url: AFCONS_JOB_URL,
        text
      })
    });

    const extractData = await extractResponse.json();

    if (!extractResponse.ok) {
      return res.status(502).json({
        error: 'Afcons page fetched, but extraction failed',
        extract_status: extractResponse.status,
        details: extractData
      });
    }

    // 3. TEST ONLY — nothing is saved to Supabase
    return res.status(200).json({
      success: true,
      source: AFCONS_JOB_URL,
      extracted: extractData.job || extractData
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Afcons extraction test failed',
      details: error.message
    });
  }
};
