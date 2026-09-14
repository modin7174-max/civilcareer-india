const SUPA = process.env.SUPABASE_URL;

const SUPA_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

const CRON_SECRET = process.env.CRON_SECRET;

const SOURCES = [
  {
    id: "afcons",
    company: "Afcons Infrastructure Limited",
    listUrl:
      "https://careers.afcons.com/search/?createNewAlert=no&q=&locationsearch=",
    host: "careers.afcons.com",
    type: "company"
  },
  {
    id: "tata-projects",
    company: "Tata Projects Limited",
    listUrl:
      "https://careers.tataprojects.com/viewalljobs/",
    host: "careers.tataprojects.com",
    type: "company"
  },
  {
    id: "shapoorji",
    company: "Shapoorji Pallonji & Company",
    listUrl:
      "https://careers.shapoorji.com/viewalljobs/",
    host: "careers.shapoorji.com",
    type: "company"
  },
  {
    id: "lt",
    company: "Larsen & Toubro Limited",
    listUrl:
      "https://careers.larsentoubro.com/",
    host: "careers.larsentoubro.com",
    type: "company"
  },
  {
    id: "ashoka",
    company: "Ashoka Buildcon Limited",
    listUrl:
      "https://www.ashokabuildcon.com/career.php",
    host: "www.ashokabuildcon.com",
    type: "company"
  },
  {
    id: "hcc",
    company: "Hindustan Construction Company Limited",
    listUrl:
      "https://hccindia.com/career/current-opening",
    host: "hccindia.com",
    type: "company"
  },
  {
    id: "kpil",
    company: "Kalpataru Projects International Limited",
    listUrl:
      "https://careers.kalpataruprojects.com/",
    host: "careers.kalpataruprojects.com",
    type: "company"
  },
  {
    id: "ircon-contract",
    company: "IRCON International Limited",
    listUrl:
      "https://www.ircon.org/career-ircon/contract-employment?langcode=en&title=2026",
    host: "www.ircon.org",
    type: "ircon"
  },
  {
    id: "ircon-regular",
    company: "IRCON International Limited",
    listUrl:
      "https://www.ircon.org/career-ircon/regular-employment",
    host: "www.ircon.org",
    type: "ircon"
  }
];

const CIVIL_TITLE_KEYWORDS = [
  "civil",
  "structural",
  "construction",
  "site engineer",
  "site manager",
  "construction manager",
  "planning engineer",
  "planning manager",
  "project engineer",
  "project manager",
  "quantity survey",
  "quantity surveying",
  "qs engineer",
  "billing engineer",
  "bridge",
  "metro",
  "highway",
  "road",
  "water",
  "infrastructure",
  "tunnel",
  "geotechnical",
  "building",
  "roads",
  "estimation",
  "estimator",
  "contracts engineer",
  "contracts manager",
  "project controls",
  "works engineer"
];

const CIVIL_QUALIFICATION_KEYWORDS = [
  "civil engineering",
  "civil engineer",
  "civil/structural",
  "civil / structural",
  "structural engineering",
  "civil/mech engineering",
  "civil / mech engineering",
  "diploma in civil",
  "diploma civil",
  "b.e. civil",
  "be civil",
  "b.tech civil",
  "btech civil"
];

const CIVIL_DESCRIPTION_KEYWORDS = [
  "civil engineering",
  "civil engineer",
  "structural engineering",
  "quantity surveying",
  "quantity survey",
  "construction site",
  "construction project",
  "building construction",
  "road construction",
  "bridge construction",
  "metro construction",
  "infrastructure project"
];

const EXCLUDED_KEYWORDS = [
  "talent acquisition",
  "human resources",
  "hr executive",
  "hr manager",
  "recruitment",
  "finance",
  "accounts",
  "legal counsel",
  "company secretary",
  "secretarial",
  "electrical engineer",
  "electrical engineering",
  "instrumentation engineer",
  "instrumentation engineering",
  "mechanical engineer",
  "mechanical engineering",
  "software engineer",
  "software developer",
  "information technology",
  "it support",
  "cyber security",
  "marketing",
  "sales executive"
];

function clean(value = "") {
  return String(value)
    .replace(/\u00a0/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function htmlToText(html = "") {
  return clean(
    String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  );
}

function getMeta(html = "", name = "") {
  const escaped = name.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  const regex = new RegExp(
    `<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']*)["']`,
    "i"
  );

  const match = html.match(regex);

  return match ? clean(match[1]) : "";
}

function absoluteUrl(url, baseUrl) {
  if (!url) return "";

  try {
    return new URL(url, baseUrl).href;
  } catch {
    return "";
  }
}

function extractLinks(html, baseUrl) {
  const links = [];
  const seen = new Set();

  const regex =
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match;

  while ((match = regex.exec(html))) {
    const url = absoluteUrl(
      match[1],
      baseUrl
    );

    if (!url) continue;

    const text = clean(
      htmlToText(match[2])
    );

    if (seen.has(url)) continue;

    seen.add(url);

    links.push({
      url,
      text
    });
  }

  return links;
}

function extractJobLinks(source, html) {
  const links = extractLinks(
    html,
    source.listUrl
  );

  const results = [];
  const seen = new Set();

  for (const link of links) {
    const url = link.url.toLowerCase();
    const text = link.text.toLowerCase();

    let likelyJob = false;

    if (source.id === "afcons") {
      likelyJob =
        url.includes("/job/") ||
        text.includes("engineer") ||
        text.includes("manager") ||
        text.includes("construction");
    }

    if (
      source.id === "tata-projects" ||
      source.id === "shapoorji"
    ) {
      likelyJob =
        url.includes("/job/") ||
        url.includes("/ec/job/");
    }

    if (source.id === "lt") {
      likelyJob =
        url.includes("job") ||
        text.includes("engineer") ||
        text.includes("manager");
    }

    if (source.id === "ashoka") {
      likelyJob =
        url.includes("career-details.php") ||
        url.includes("career-detail");
    }

    if (source.id === "hcc") {
      likelyJob =
        url.includes("/career/") ||
        url.includes("/careers/");
    }

    if (source.id === "kpil") {
      likelyJob =
        url.includes("careers.kalpataruprojects.com") &&
        (
          url.includes("/job/") ||
          url.includes("/go/")
        );
    }

    if (!likelyJob) continue;

    if (seen.has(link.url)) continue;

    seen.add(link.url);

    results.push(link);
  }

  return results;
}

function extractIrconLinks(source, html) {
  const links = extractLinks(
    html,
    source.listUrl
  );

  return links.filter((link) => {
    const url = link.url.toLowerCase();
    const text = link.text.toLowerCase();

    return (
      url.endsWith(".pdf") ||
      url.includes(".pdf?") ||
      text.includes("civil") ||
      text.includes("works engineer") ||
      text.includes("manager/civil") ||
      text.includes("executive/civil")
    );
  });
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match && match[1]) {
      return clean(match[1]);
    }
  }

  return "";
}

function extractExperience(text) {
  return firstMatch(text, [
    /Experience Range\s*:\s*(.*?)(?=\s+Work Environment\b)/i,
    /Minimum Experience\s*:\s*(.*?)(?=\s+(?:Maximum Experience|Function|Sector)\b)/i,
    /Experience\s*:\s*(.*?)(?=\s+(?:Education|Qualification|Responsibilities)\b)/i,
    /(\d+\s*\+?\s*years?\s*(?:of\s+)?experience)/i
  ]);
}

function extractCommonJob(
  html,
  url,
  source
) {
  const text = htmlToText(html);

  let role =
    getMeta(html, "og:title") ||
    getMeta(html, "twitter:title");

  role = clean(role)
    .replace(/\s+Job Details.*$/i, "")
    .replace(/\s+\|.*$/i, "")
    .replace(/\s+-\s+.*$/i, "")
    .trim();

  if (!role) {
    role =
      firstMatch(text, [
        /Job Title\s*:\s*(.*?)(?=\s+(?:Location|Date|Company)\s*:)/i,
        /Title\s*:\s*(.*?)(?=\s+(?:Location|Date|Company)\s*:)/i
      ]);
  }

  if (!role) {
    role = "Civil / Construction Job";
  }

  const company =
    firstMatch(text, [
      /Company\s*:\s*(.*?)(?=\s+(?:Roles|Job Description|Responsibilities|Apply|Date)\b)/i
    ]) ||
    source.company;

  const location =
    firstMatch(text, [
      /Location\s*:\s*(.*?)(?=\s+Company\s*:)/i,
      /Location\s*:\s*(.*?)(?=\s+Date\s*:)/i,
      /Job Location\s*:\s*(.*?)(?=\s+(?:Company|Date)\s*:)/i
    ]);

  const qualification =
    firstMatch(text, [
      /Educational Essential\s*:\s*(.*?)(?=\s+Educational Desirable)/i,
      /Education Qualifications\s*:\s*(.*?)(?=\s+(?:Computer Software|Experience Range|Work Environment))/i,
      /Qualifications?\s*:\s*(.*?)(?=\s+(?:Experience|Responsibilities|Job Description))/i
    ]);

  return {
    source_url: url,
    application_url: url,
    role,
    company,
    location,
    qualification,
    experience_level:
      extractExperience(text),
    description:
      text.slice(0, 15000),
    sector: "Private",
    status: "Pending Review",
    published: false
  };
}

function isCivilJob(job) {
  const title =
    String(job.role || "").toLowerCase();

  const qualification =
    String(job.qualification || "").toLowerCase();

  const description =
    String(job.description || "").toLowerCase();

  if (
    EXCLUDED_KEYWORDS.some(
      keyword => title.includes(keyword)
    )
  ) {
    return false;
  }

  const hasCivilTitle =
    CIVIL_TITLE_KEYWORDS.some(
      keyword => title.includes(keyword)
    );

  const hasCivilQualification =
    CIVIL_QUALIFICATION_KEYWORDS.some(
      keyword =>
        qualification.includes(keyword)
    );

  const hasCivilDescription =
    CIVIL_DESCRIPTION_KEYWORDS.some(
      keyword =>
        description.includes(keyword)
    );

  if (
    title.includes("quantity survey") ||
    title.includes("quantity surveying") ||
    title.includes("qs engineer")
  ) {
    return (
      hasCivilQualification ||
      description.includes("civil engineering") ||
      description.includes("civil engineer")
    );
  }

  return (
    hasCivilQualification ||
    hasCivilTitle ||
    (hasCivilDescription &&
      hasCivilTitle)
  );
}

function isCivilIrconTitle(title) {
  const value =
    String(title || "").toLowerCase();

  if (
    EXCLUDED_KEYWORDS.some(
      keyword => value.includes(keyword)
    )
  ) {
    return false;
  }

  return CIVIL_TITLE_KEYWORDS.some(
    keyword => value.includes(keyword)
  );
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; CivilCareerJobs/4.0)",
      Accept:
        "text/html,application/xhtml+xml"
    }
  });

  if (!response.ok) {
    throw new Error(
      `Fetch failed: ${response.status}`
    );
  }

  return response.text();
}

async function jobAlreadyExists(
  sourceUrl
) {
  const url =
    `${SUPA}/rest/v1/jobs` +
    `?source_url=eq.${encodeURIComponent(sourceUrl)}` +
    `&select=id` +
    `&limit=1`;

  const response = await fetch(url, {
    headers: {
      apikey: SUPA_KEY,
      Authorization:
        `Bearer ${SUPA_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error(
      `Supabase duplicate check failed: ${response.status}`
    );
  }

  const rows =
    await response.json();

  return (
    Array.isArray(rows) &&
    rows.length > 0
  );
}

async function insertJob(job) {
  const response = await fetch(
    `${SUPA}/rest/v1/jobs`,
    {
      method: "POST",
      headers: {
        apikey: SUPA_KEY,
        Authorization:
          `Bearer ${SUPA_KEY}`,
        "Content-Type":
          "application/json",
        Prefer:
          "return=representation"
      },
      body: JSON.stringify(job)
    }
  );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `Supabase insert failed: ${response.status} ${errorText}`
    );
  }

  return response.json();
}

async function syncCompanySource(
  source
) {
  const result = {
    source: source.id,
    company: source.company,
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
    const html =
      await fetchHtml(
        source.listUrl
      );

    const links =
      extractJobLinks(
        source,
        html
      );

    result.links_found =
      links.length;

    const limited =
      links.slice(0, 30);

    const fetched =
      await Promise.allSettled(
        limited.map(
          async link => {
            const jobHtml =
              await fetchHtml(
                link.url
              );

            return extractCommonJob(
              jobHtml,
              link.url,
              source
            );
          }
        )
      );

    for (
      let i = 0;
      i < fetched.length;
      i++
    ) {
      const item = fetched[i];

      if (
        item.status ===
        "rejected"
      ) {
        result.fetch_errors++;

        result.errors.push({
          url: limited[i].url,
          error:
            item.reason?.message ||
            String(item.reason)
        });

        continue;
      }

      const job =
        item.value;

      if (!isCivilJob(job)) {
        continue;
      }

      result.civil_jobs_found++;

      try {
        if (
          await jobAlreadyExists(
            job.source_url
          )
        ) {
          result.skipped_existing++;
          continue;
        }

        await insertJob(job);

        result.inserted++;

        result.jobs.push({
          role: job.role,
          company: job.company,
          location: job.location,
          source_url:
            job.source_url
        });
      } catch (error) {
        result.insert_errors++;

        result.errors.push({
          url:
            job.source_url,
          error:
            error.message
        });
      }
    }

    return result;
  } catch (error) {
    result.fetch_errors++;

    result.errors.push({
      url: source.listUrl,
      error: error.message
    });

    return result;
  }
}

async function syncIrconSource(
  source
) {
  const result = {
    source: source.id,
    company: source.company,
    type: "IRCON",
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
    const html =
      await fetchHtml(
        source.listUrl
      );

    const links =
      extractIrconLinks(
        source,
        html
      );

    result.links_found =
      links.length;

    for (
      const link of links.slice(0, 50)
    ) {
      const title =
        clean(
          link.text ||
          "IRCON Civil Recruitment"
        );

      if (
        !isCivilIrconTitle(
          title
        )
      ) {
        continue;
      }

      result.civil_jobs_found++;

      try {
        if (
          await jobAlreadyExists(
            link.url
          )
        ) {
          result.skipped_existing++;
          continue;
        }

        const job = {
          source: "IRCON",
          source_url:
            link.url,
          application_url:
            link.url,
          role: title,
          company:
            "IRCON International Limited",
          location: "",
          qualification: "",
          experience_level: "",
          description:
            `${title}\n\n` +
            `Official IRCON recruitment notice.\n\n` +
            `Original notification: ${link.url}`,
          sector:
            "Government / PSU",
          employment_type:
            source.id ===
            "ircon-contract"
              ? "Contract"
              : "Full-time",
          status:
            "Pending Review",
          published: false
        };

        await insertJob(
          job
        );

        result.inserted++;

        result.jobs.push({
          role: title,
          source_url:
            link.url
        });
      } catch (error) {
        result.insert_errors++;

        result.errors.push({
          url: link.url,
          error:
            error.message
        });
      }
    }

    return result;
  } catch (error) {
    result.fetch_errors++;

    result.errors.push({
      url: source.listUrl,
      error: error.message
    });

    return result;
  }
}

function authorized(req) {
  if (!CRON_SECRET) {
    return true;
  }

  const authorization =
    req.headers.authorization ||
    "";

  return (
    authorization ===
    `Bearer ${CRON_SECRET}`
  );
}

module.exports = async function handler(
  req,
  res
) {
  if (
    req.method !== "GET" &&
    req.method !== "POST"
  ) {
    return res.status(405).json({
      success: false,
      error:
        "Method not allowed"
    });
  }

  if (!authorized(req)) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized"
    });
  }

  if (!SUPA || !SUPA_KEY) {
    return res.status(500).json({
      success: false,
      error:
        "Supabase environment variables are missing"
    });
  }

  const startedAt =
    new Date().toISOString();

  const results = [];

  for (
    const source of SOURCES
  ) {
    if (
      source.type === "ircon"
    ) {
      results.push(
        await syncIrconSource(
          source
        )
      );
    } else {
      results.push(
        await syncCompanySource(
          source
        )
      );
    }
  }

  const totals =
    results.reduce(
      (acc, item) => {
        acc.links_found +=
          item.links_found || 0;

        acc.civil_jobs_found +=
          item.civil_jobs_found || 0;

        acc.inserted +=
          item.inserted || 0;

        acc.skipped_existing +=
          item.skipped_existing ||
          0;

        acc.fetch_errors +=
          item.fetch_errors || 0;

        acc.insert_errors +=
          item.insert_errors || 0;

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
    collector:
      "CivilCareer Unified Job Sync v2",
    started_at: startedAt,
    finished_at:
      new Date().toISOString(),
    companies: results,
    totals
  });
};
