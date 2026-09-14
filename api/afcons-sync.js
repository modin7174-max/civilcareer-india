const AFCONS_URL =
  'https://careers.afcons.com/search/?createNewAlert=no&q=&locationsearch=';

function absoluteUrl(href) {
  if (!href) return '';
  try {
    return new URL(href, AFCONS_URL).href;
  } catch {
    return '';
  }
}

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

    const jobs = [];
    const seen = new Set();

    const linkRegex =
      /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      const text = match[2]
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const url = absoluteUrl(href);

      if (
        url &&
        /careers\.afcons\.com\/job\//i.test(url) &&
        text &&
        !seen.has(url)
      ) {
        seen.add(url);

        jobs.push({
          title: text,
          url
        });
      }
    }

    return res.status(200).json({
      success: true,
      source: AFCONS_URL,
      total_found: jobs.length,
      jobs: jobs.slice(0, 25)
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Afcons parser failed',
      details: error.message
    });
  }
};
