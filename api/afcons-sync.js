const AFCONS_JOB_URL =
  'https://careers.afcons.com/job/India-SITE-ENGINEER-URBAN-Any/58071744/';

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch(AFCONS_JOB_URL);

    if (!response.ok) {
      return res.status(502).json({
        error: 'Could not fetch Afcons job page',
        status: response.status
      });
    }

    const html = await response.text();

    return res.status(200).json({
      success: true,
      source: AFCONS_JOB_URL,
      length: html.length,
      preview: html.slice(0, 5000)
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Afcons job fetch failed',
      details: error.message
    });
  }
};
