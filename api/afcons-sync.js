const AFCONS_LIST_URL =
  'https://careers.afcons.com/search/?createNewAlert=no&q=&locationsearch=';

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
    `<meta[^>]+(?:name|property)=["']${name.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    )}["'][^>]+content=["']([^"']*)["']`,
    'i'
  );

  const m = html.match(re);
  return m ? clean(m[1]) : '';
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

function extractAfconsField(text, label, nextLabels = []) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const nextPart = nextLabels.length
    ? `(?=\\s+(?:${nextLabels
        .map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|')})\\s*(?::|$))`
    : '$';

  const re = new RegExp(
    `${escapedLabel}\\s*(?::\\s*|\\s+)(.*?)(?:${nextPart})`,
    'i'
  );

  const m = text.match(re);
  return clean(m ? m[1] : '');
}
function extractJobLinks(html) {
  const links = [];
  const seen = new Set();

  const re =
    /href=["']([^"']*\/job\/[^"']+)["']/gi;

  let m;

  while ((m = re.exec(html))) {
    let url = m[1];

    if (url.startsWith('/')) {
      url = 'https://careers.afcons.com' + url;
    }

    url = url.replace(/&amp;/gi, '&');

    if (!seen.has(url)) {
      seen.add(url);
      links.push(url);
    }
  }

  return links;
}

async function fetchJob(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; CivilCareerJobs/2.0)',
      Accept:
        'text/html,application/xhtml+xml'
    }
  });

  if (!response.ok) {
    throw new Error(
      `Afcons job fetch failed: ${response.status}`
    );
  }

  const html = await response.text();
  const text = htmlToText(html);

  const role =
    getMeta(html, 'og:title') ||
    getMeta(html, 'twitter:title') ||
    'Untitled vacancy';

 const company =
  extractAfconsField(text, 'Company', [
    'Roles and Responsibilities'
  ]) ||
  'Afcons Infrastructure Limited';

const location =
  extractAfconsField(text, 'Location', [
    'Company'
  ]);

const posted_date =
  extractAfconsField(text, 'Date', [
    'Location'
  ]);

const qualification =
  extractAfconsField(text, 'Educational Essential', [
    'Educational Desirable'
  ]);

const experience_level =
  extractAfconsField(text, 'Experience Range', [
    'Work Environment'
  ]) ||
  extractAfconsField(text, 'Experience Range', [
    'Apply now'
  ]);
  return {
    source_url: url,
    application_url: url,
    role,
    company,
    location,
    posted_date,
    qualification,
    experience_level,
    description: text.slice(0, 15000),
    sector: 'Private',
    status: 'Pending Review',
    published: false
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const response = await fetch(AFCONS_LIST_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; CivilCareerJobs/2.0)',
        Accept:
          'text/html,application/xhtml+xml'
      }
    });

    if (!response.ok) {
      throw new Error(
        `Afcons listing fetch failed: ${response.status}`
      );
    }

    const html = await response.text();

    const links = extractJobLinks(html);

    const jobs = [];

    for (const url of links) {
      try {
        const job = await fetchJob(url);
        jobs.push(job);
      } catch (error) {
        jobs.push({
          source_url: url,
          error: error.message
        });
      }
    }

    return res.status(200).json({
      success: true,
      source: AFCONS_LIST_URL,
      total_found: links.length,
      total_processed: jobs.length,
      jobs
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
