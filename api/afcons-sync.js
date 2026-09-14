const AFCONS_JOB_URL =
  'https://careers.afcons.com/job/India-SITE-ENGINEER-URBAN-Any/58071744/';

function clean(value = '') {
  return String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function getMeta(html, name) {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']*)["']`,
    'i'
  );

  const match = html.match(re);

  return clean(match ? match[1] : '');
}

function htmlToText(html) {
  return clean(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  );
}

function afterLabel(text, label, nextLabels = []) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const next =
    nextLabels.length
      ? `(?=\\s+(?:${nextLabels
          .map(x =>
            x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          )
          .join('|')})\\s*:)`
      : '$';

  const re = new RegExp(
    `${escaped}\\s*:\\s*(.*?)(?:${next})`,
    'i'
  );

  const match = text.match(re);

  return clean(match ? match[1] : '');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  try {
    const response = await fetch(AFCONS_JOB_URL, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (compatible; CivilCareerJobs/2.0)',
        accept:
          'text/html,application/xhtml+xml'
      }
    });

    if (!response.ok) {
      return res.status(502).json({
        error: 'Could not fetch Afcons job page',
        status: response.status
      });
    }

    const html = await response.text();
    const text = htmlToText(html);

    const role =
      getMeta(html, 'og:title') ||
      getMeta(html, 'twitter:title') ||
      'Untitled vacancy';

    const location = afterLabel(
      text,
      'Location',
      ['Company']
    );

    const company = afterLabel(
      text,
      'Company',
      ['Roles and Responsibilities', 'Education Qualifications']
    );

    const date = afterLabel(
      text,
      'Date',
      ['Location']
    );

    return res.status(200).json({
      success: true,
      source_url: AFCONS_JOB_URL,

      extracted: {
        role,
        company,
        location,
        posted_date: date,
        sector: 'Private',

        qualification:
          'Bachelor’s Degree in Civil Engineering / Diploma in Civil Engineering',

        experience_level:
          '5 to 10 years',

        description: text.slice(0, 15000)
      }
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Afcons parser failed',
      details: error.message
    });
  }
};
