const SUPA = process.env.SUPABASE_URL;

const SUPA_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

const SOURCES = [
  {
    id: 'afcons',
    company: 'Afcons Infrastructure Limited',
    listUrl:
      'https://careers.afcons.com/search/?createNewAlert=no&q=&locationsearch=',
    host: 'careers.afcons.com'
  },
  {
    id: 'tata-projects',
    company: 'Tata Projects Limited',
    listUrl:
      'https://careers.tataprojects.com/viewalljobs/',
    host: 'careers.tataprojects.com'
  },
  {
    id: 'shapoorji',
    company: 'Shapoorji Pallonji & Company',
    listUrl:
      'https://careers.shapoorji.com/viewalljobs/',
    host: 'careers.shapoorji.com'
  },
  {
    id: 'lt',
    company: 'Larsen & Toubro Limited',
    listUrl:
      'https://careers.larsentoubro.com/',
    host: 'careers.larsentoubro.com'
  }
];

function clean(value = '') {
  return String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtml(value = '') {
  return clean(value);
}

function htmlToText(html) {
  return clean(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  );
}

function getMeta(html, name) {
  const escaped = name.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );

  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']*)["']`,
    'i'
  );

  const m = html.match(re);

  return m ? decodeHtml(m[1]) : '';
}

function absoluteUrl(url, host) {
  if (!url) return '';

  let value = decodeHtml(url);

  if (value.startsWith('//')) {
    value = 'https:' + value;
  }

  if (value.startsWith('/')) {
    value = `https://${host}${value}`;
  }

  return value;
}

function extractJobLinks(html, host) {
  const links = [];
  const seen = new Set();

  const patterns = [
    /href=["']([^"']*\/job\/[^"']+)["']/gi,
    /href=["']([^"']*\/EC\/job\/[^"']+)["']/gi
  ];

  for (const re of patterns) {
    let m;

    while ((m = re.exec(html))) {
      const url = absoluteUrl(m[1], host);

      if (!url) continue;

      if (!url.includes(host)) continue;

      if (!/\/(?:EC\/)?job\//i.test(url)) continue;

      if (!seen.has(url)) {
        seen.add(url);
        links.push(url);
      }
    }
  }

  return links;
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const m = text.match(pattern);

    if (m && m[1]) {
      return clean(m[1]);
    }
  }

  return '';
}

function extractCommonJob(html, url, source) {
  const text = htmlToText(html);

  const role =
    getMeta(html, 'og:title')
      .replace(/\s+Job Details.*$/i, '')
      .replace(/\s+\|\s+.*$/i, '')
      .trim() ||
    getMeta(html, 'twitter:title')
      .replace(/\s+Job Details.*$/i, '')
      .trim() ||
    firstMatch(text, [
      /(?:Job Title|Title)\s*:\s*(.*?)(?=\s+(?:Location|Date|Company)\s*:)/i
    ]) ||
    'Untitled vacancy';

  const company =
    firstMatch(text, [
      /Company\s*:\s*(.*?)(?=\s+(?:Roles|Job Description|Responsibilities|Apply|Date)\b)/i
    ]) ||
    source.company;

  const location =
    firstMatch(text, [
      /Location\s*:\s*(.*?)(?=\s+Company\s*:)/i,
      /Location\s*:\s*(.*?)(?=\s+Date\s*:)/i
    ]);

  const qualification =
    firstMatch(text, [
      /Educational Essential\s*:\s*(.*?)(?=\s+Educational Desirable)/i,
      /Education Qualifications\s*(.*?)(?=\s+(?:Computer Software|Experience Range|Work Environment))/i,
      /Qualifications?\s*:\s*(.*?)(?=\s+(?:Experience|Responsibilities|Job Description))/i
    ]);

  const experience_level =
    firstMatch(text, [
      /Experience Range\s*:\s*(.*?)(?=\s+Work Environment\b)/i,
      /Minimum Experience\s*:\s*(.*?)(?=\s+(?:Maximum Experience|Function|Sector)\b)/i,
      /Experience\s*:\s*(.*?)(?=\s+(?:Education|Qualification|Responsibilities)\b)/i
    ]);

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

function isCivilJob(job) {
  const title =
    String(job.role || '').toLowerCase();

  const qualification =
    String(job.qualification || '').toLowerCase();

  const description =
    String(job.description || '').toLowerCase();

  const civilTitle = [
    'civil',
    'structural',
    'construction',
    'site engineer',
    'site manager',
    'construction manager',
    'planning engineer',
    'project engineer',
    'project manager',
    'quantity survey',
    'quantity surveying',
    'qs engineer',
    'billing engineer',
    'planning',
    'bridge',
    'metro',
    'highway',
    'road',
    'water',
    'infrastructure',
    'tunnel',
    'geotechnical',
    'building',
    'roads',
    'estimation',
    'estimator',
    'contracts engineer',
    'contracts manager',
    'project controls'
  ];

  const civilQualification = [
    'civil engineering',
    'civil engineer',
    'civil/structural',
    'civil / structural',
    'structural engineering',
    'civil/mech engineering',
    'civil / mech engineering',
    'diploma in civil',
    'diploma civil'
  ];

  const civilDescription = [
    'civil engineering',
    'civil engineer',
    'structural engineering',
    'quantity surveying',
    'quantity survey',
    'construction site',
    'construction project',
    'building construction',
    'road construction',
    'bridge construction',
    'metro construction',
    'infrastructure project'
  ];

  const excluded = [
    'talent acquisition',
    'human resources',
    'hr executive',
    'hr manager',
    'recruitment',
    'finance',
    'accounts',
    'legal counsel',
    'company secretary',
    'secretarial',
    'electrical engineer',
    'electrical engineering',
    'instrumentation engineer',
    'instrumentation engineering',
    'mechanical engineer',
    'mechanical engineering',
    'software engineer',
    'software developer',
    'information technology',
    'it support',
    'cyber security',
    'marketing',
    'sales executive'
  ];

  if (
    excluded.some(keyword =>
      title.includes(keyword)
    )
  ) {
    return false;
  }

  const hasCivilTitle =
    civilTitle.some(keyword =>
      title.includes(keyword)
    );

  const hasCivilQualification =
    civilQualification.some(keyword =>
      qualification.includes(keyword)
    );

  const hasCivilDescription =
    civilDescription.some(keyword =>
      description.includes(keyword)
    );

  /*
   * Quantity Survey roles require Civil evidence.
   * This avoids importing mechanical-only QS positions.
   */
  if (
    title.includes('quantity survey') ||
    title.includes('quantity surveying') ||
    title.includes('qs engineer')
  ) {
    return (
      hasCivilQualification ||
      description.includes('civil engineering') ||
      description.includes('civil engineer')
    );
  }

  return (
    hasCivilQualification ||
    hasCivilTitle ||
    (hasCivilDescription && hasCivilTitle)
  );
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; CivilCareerJobs/3.0)',
      Accept:
        'text/html,application/xhtml+xml'
    }
  });

  if (!response.ok) {
    throw new Error(
      `Fetch failed: ${response.status}`
    );
  }

  return response.text();
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

async function syncSource(source) {
  const result = {
    source: source.id,
    company: source.company,
    list_url: source.listUrl,
    links_found: 0,
    civil_jobs_found: 0,
    inserted: 0,
    skipped_existing: 0,
    fetch_errors: 0,
    insert_errors: 0,
    errors: [],
    jobs: []
  };

  try {
    const html = await fetchHtml(source.listUrl);

    const links =
      extractJobLinks(html, source.host);

    result.links_found = links.length;

    /*
     * Keep the first sync within Vercel's execution limit.
     * Future runs still check the live listing page.
     */
    const limitedLinks =
      links.slice(0, 40);

    const jobs = [];

    /*
     * Fetch job pages in parallel so the collector
     * doesn't spend 15 seconds fetching them one-by-one.
     */
    const fetched =
      await Promise.allSettled(
        limitedLinks.map(async url => {
          const jobHtml =
            await fetchHtml(url);

          return extractCommonJob(
            jobHtml,
            url,
            source
          );
        })
      );

    for (let i = 0; i < fetched.length; i++) {
      const item = fetched[i];

      if (item.status === 'rejected') {
        result.fetch_errors++;

        result.errors.push({
          source_url: limitedLinks[i],
          error: item.reason?.message ||
            String(item.reason)
        });

        continue;
      }

      const job = item.value;

      if (!isCivilJob(job)) {
        continue;
      }

      jobs.push(job);
    }

    result.civil_jobs_found = jobs.length;

    for (const job of jobs) {
      try {
        const exists =
          await jobAlreadyExists(
            job.source_url
          );

        if (exists) {
          result.skipped_existing++;
          continue;
        }

        await insertJob(job);

        result.inserted++;

        result.jobs.push({
          role: job.role,
          company: job.company,
          location: job.location,
          source_url: job.source_url
        });

      } catch (error) {
        result.insert_errors++;

        result.errors.push({
          source_url: job.source_url,
          role: job.role,
          error: error.message
        });
      }
    }

    return result;

  } catch (error) {
    result.errors.push({
      source_url: source.listUrl,
      error: error.message
    });

    return result;
  }
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
      error:
        'Supabase environment variables are missing'
    });
  }

  /*
   * Vercel Cron security.
   *
   * When CRON_SECRET is configured in Vercel,
   * Vercel sends:
   *
   * Authorization: Bearer <CRON_SECRET>
   */
  const cronSecret =
    process.env.CRON_SECRET;

  if (cronSecret) {
    const authorization =
      req.headers.authorization || '';

    if (
      authorization !==
      `Bearer ${cronSecret}`
    ) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
  }

  try {
    const startedAt =
      new Date().toISOString();

    /*
     * Run all company sources independently.
     * One failed company does not stop the others.
     */
    const results =
      await Promise.all(
        SOURCES.map(syncSource)
      );

    const totals =
      results.reduce(
        (acc, item) => {
          acc.links_found +=
            item.links_found;

          acc.civil_jobs_found +=
            item.civil_jobs_found;

          acc.inserted +=
            item.inserted;

          acc.skipped_existing +=
            item.skipped_existing;

          acc.fetch_errors +=
            item.fetch_errors;

          acc.insert_errors +=
            item.insert_errors;

          return acc;
        },
        {
          links_found: 0,
          civil_jobs_found: 0,
          inserted: 0,
          skipped_existing: 0,
          fetch_errors: 0,
          insert_errors: 0
        }
      );

    return res.status(200).json({
      success: true,
      started_at: startedAt,
      finished_at:
        new Date().toISOString(),

      companies: results,

      totals
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
