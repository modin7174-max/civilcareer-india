const AFCONS_LIST_URL =
  'https://careers.afcons.com/search/?createNewAlert=no&q=&locationsearch=';

const SUPA = process.env.SUPABASE_URL;

const SUPA_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

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
  const escapedLabel = label.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );

  const nextPart = nextLabels.length
    ? `(?=\\s+(?:${nextLabels
        .map(x =>
          x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        )
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

  const locationMatch = text.match(
    /Location\s*:\s*(.*?)(?=\s+Company\s*:)/i
  );

  const location = clean(
    locationMatch ? locationMatch[1] : ''
  );

  const posted_date =
    extractAfconsField(text, 'Date', [
      'Location'
    ]);

  const qualification =
    extractAfconsField(text, 'Educational Essential', [
      'Educational Desirable'
    ]);

  const experienceMatch = text.match(
    /Experience Range\s*(.*?)(?=\s+Work Environment\b|$)/i
  );

  const experience_level = clean(
    experienceMatch ? experienceMatch[1] : ''
  );

  return {
    source_url: url,
    application_url: url,
    role,
    company,
    location,
    qualification,
    experience_level,
    description: text.slice(0, 15000),
    sector: 'Private',
    status: 'Pending Review',
    published: false
  };
}

async function jobAlreadyExists(sourceUrl) {
  const url =
    `${SUPA}/rest/v1/jobs` +
    `?source_url=eq.${encodeURIComponent(sourceUrl)}` +
    `&select=id` +
    `&limit=1`;

  const response = await fetch(url, {
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error(
      `Supabase duplicate check failed: ${response.status}`
    );
  }

  const rows = await response.json();

  return Array.isArray(rows) && rows.length > 0;
}

async function insertJob(job) {
  const response = await fetch(
    `${SUPA}/rest/v1/jobs`,
    {
      method: 'POST',
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify(job)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Supabase insert failed: ${response.status} ${errorText}`
    );
  }

  return response.json();
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  if (!SUPA || !SUPA_KEY) {
    return res.status(500).json({
      success: false,
      error: 'Supabase environment variables are missing'
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
    const errors = [];

    for (const url of links) {
      try {
        const job = await fetchJob(url);

        const title =
          String(job.role || '').toLowerCase();

        const qualification =
          String(job.qualification || '').toLowerCase();

        const civilTitle = [
          'civil',
          'structural',
          'construction',
          'site engineer',
          'quantity survey',
          'planner',
          'planning engineer',
          'bridge',
          'metro',
          'highway',
          'road',
          'water',
          'infrastructure',
          'tunnel',
          'geotechnical'
        ];

        const civilQualification = [
          'civil engineering',
          'civil engineer',
          'structural engineering',
          'civil/structural'
        ];

        const excludedTitle = [
          'p&a',
          'personnel',
          'admin',
          'talent acquisition',
          'hr',
          'human resource',
          'safety engineer',
          'instrumentation',
          'electrical',
          'mechanical',
          'finance',
          'accounts',
          'legal',
          'procurement',
          'secretarial'
        ];

        const isExcluded =
          excludedTitle.some(keyword =>
            title.includes(keyword)
          );

        const hasCivilTitle =
          civilTitle.some(keyword =>
            title.includes(keyword)
          );

        const hasCivilQualification =
          civilQualification.some(keyword =>
            qualification.includes(keyword)
          );

        const isCivilJob =
          !isExcluded &&
          (hasCivilTitle || hasCivilQualification);

        if (!isCivilJob) {
          continue;
        }

        jobs.push(job);

      } catch (error) {
        errors.push({
          source_url: url,
          error: error.message
        });
      }
    }

    let inserted = 0;
    let skipped_existing = 0;
    const insert_errors = [];

    for (const job of jobs) {
      try {
        const exists =
          await jobAlreadyExists(job.source_url);

        if (exists) {
          skipped_existing++;
          continue;
        }

        await insertJob(job);
        inserted++;

      } catch (error) {
        insert_errors.push({
          source_url: job.source_url,
          role: job.role,
          error: error.message
        });
      }
    }

    return res.status(200).json({
      success: true,
      source: AFCONS_LIST_URL,
      total_found: links.length,
      civil_jobs_found: jobs.length,
      inserted,
      skipped_existing,
      fetch_errors: errors.length,
      insert_errors: insert_errors.length,
      errors,
      insert_errors_detail: insert_errors,
      jobs
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
