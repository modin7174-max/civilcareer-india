const AFCONS_URL =
  'https://careers.afcons.com/search/?createNewAlert=no&q=&locationsearch=';

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch(AFCONS_URL);

    if (!response.ok) {
      return res.status(502).json({
        error: 'Could not fetch Afcons jobs page',
        status: response.status
      });
    }

    const html = await response.text();

    return res.status(200).json({
      success: true,
      source: AFCONS_URL,
      length: html.length,
      preview: html.slice(0, 1000)
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Afcons fetch failed',
      details: error.message
    });
  }
};
