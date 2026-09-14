const SUPA = process.env.SUPABASE_URL;
const SUPA_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

const CRON_SECRET = process.env.CRON_SECRET;

const SOURCES = [
  {
    id: "afcons",
    company: "Afcons Infrastructure Limited",
    url: "https://careers.afcons.com/search/?createNewAlert=no&q=&locationsearch="
  },
  {
    id: "tata",
    company: "Tata Projects Limited",
    url: "https://careers.tataprojects.com/viewalljobs/"
  },
  {
    id: "shapoorji",
    company: "Shapoorji Pallonji & Company",
    url: "https://careers.shapoorji.com/viewalljobs/"
  },
  {
    id: "lt",
    company: "Larsen & Toubro Limited",
    url: "https://careers.larsentoubro.com/"
  },
  {
    id: "ashoka",
    company: "Ashoka Buildcon Limited",
    url: "https://www.ashokabuildcon.com/career.php"
  },
  {
    id: "hcc",
    company: "Hindustan Construction Company Limited",
    url: "https://hccindia.com/career/current-opening"
  },
  {
    id: "kpil",
    company: "Kalpataru Projects International Limited",
    url: "https://careers.kalpataruprojects.com/"
  },
  {
    id: "ircon-contract",
    company: "IRCON International Limited",
    url: "https://www.ircon.org/career-ircon/contract-employment?langcode=en&title=2026"
  },
  {
    id: "ircon-regular",
    company: "IRCON International Limited",
    url: "https://www.ircon.org/career-ircon/regular-employment"
  }
];

const CIVIL = [
  "civil",
  "structural",
  "construction",
  "site engineer",
  "site manager",
  "project engineer",
  "project manager",
  "planning engineer",
  "planning manager",
  "quantity survey",
  "quantity surveying",
  "qs engineer",
  "highway",
  "road",
  "bridge",
  "metro",
  "railway",
  "water",
  "infrastructure",
  "tunnel",
  "geotechnical",
  "building",
  "works engineer"
];

const EXCLUDE = [
  "human resources",
  "talent acquisition",
  "recruitment",
  "finance",
  "accounts",
  "legal",
  "electrical engineer",
  "mechanical engineer",
  "instrumentation engineer",
  "software engineer",
  "software developer",
  "information technology"
];

function clean(s) {
  return String(s || "")
    .replace(/\u00a0/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function textFromHtml(html) {
  return clean(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );
}

function linksFromHtml(html, base) {
  const out = [];
  const seen = new Set();

  const re =
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let m;

  while ((m = re.exec(html))) {
    try {
      const url = new URL(m[1], base).href;

      if (!seen.has(url)) {
        seen.add(url);

        out.push({
          url,
          text: clean(m[2])
        });
      }
    } catch {}
  }

  return out;
}

function isCivil(title, text = "") {
  const combined =
    `${title} ${text}`.toLowerCase();

  if (
    EXCLUDE.some(x =>
      title.toLowerCase().includes(x)
    )
  ) {
    return false;
  }

  return CIVIL.some(x =>
    combined.includes(x)
  );
}

function jobTitle(linkText, html) {
  let title = clean(linkText);

  const og =
    html.match(
      /<meta[^>]+(?:property|name)=["']og:title["'][^>]+content=["']([^"']+)/i
    );

  if (og && og[1]) {
    title = clean(og[1]);
  }

  title = title
    .replace(/\s+Job Details.*$/i, "")
    .replace(/\s+\|.*$/i, "")
    .replace(/\s+-\s+(?:Ashoka|HCC|KPIL|IRCON).*$/i, "")
    .trim();

  return title || "Civil / Construction Job";
}

async function get(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "CivilCareerIndia/1.0",
      Accept:
        "text/html,application/xhtml+xml"
    }
  });

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}`
    );
  }

  return response.text();
}

async function exists(sourceUrl) {
  const response = await fetch(
    `${SUPA}/rest/v1/jobs?source_url=eq.${encodeURIComponent(sourceUrl)}&select=id&limit=1`,
    {
      headers: {
        apikey: SUPA_KEY,
        Authorization:
          `Bearer ${SUPA_KEY}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(
      `Duplicate check HTTP ${response.status}`
    );
  }

  const rows =
    await response.json();

  return rows.length > 0;
}

async function insert(job) {
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
          "return=minimal"
      },
      body: JSON.stringify(job)
    }
  );

  if (!response.ok) {
    throw new Error(
      `Insert HTTP ${response.status}: ${await response.text()}`
    );
  }
}

async function processSource(source) {
  const result = {
    source: source.id,
    company: source.company,
    links: 0,
    civil: 0,
    inserted: 0,
    existing: 0,
    errors: []
  };

  try {
    const html =
      await get(source.url);

    const links =
      linksFromHtml(
        html,
        source.url
      );

    /*
     * IRCON:
     * use PDF/notice links.
     *
     * Other companies:
     * use job/career links.
     */
    let candidates;

    if (
      source.id.startsWith("ircon")
    ) {
      candidates =
        links.filter(x =>
          /\.pdf(?:\?|$)/i.test(x.url) ||
          /civil|works engineer|manager\/civil|executive\/civil/i.test(x.text)
        );
    } else {
      candidates =
        links.filter(x =>
          /job|career|vacancy|opening/i.test(
            `${x.url} ${x.text}`
          )
        );
    }

    result.links =
      candidates.length;

    /*
     * Limit each source during one execution.
     */
    candidates =
      candidates.slice(0, 20);

    for (const link of candidates) {
      const title =
        jobTitle(
          link.text,
          html
        );

      if (
        !isCivil(
          title,
          link.text
        )
      ) {
        continue;
      }

      result.civil++;

      if (
        await exists(link.url)
      ) {
        result.existing++;
        continue;
      }

      const isIrcon =
        source.id.startsWith(
          "ircon"
        );

      await insert({
        source:
          isIrcon
            ? "IRCON"
            : source.company,

        source_url:
          link.url,

        application_url:
          link.url,

        role: title,

        company:
          source.company,

        location: "",

        qualification: "",

        experience_level: "",

        description:
          isIrcon
            ? `Official IRCON recruitment notice: ${link.url}`
            : `Official ${source.company} vacancy: ${link.url}`,

        sector:
          isIrcon
            ? "Government / PSU"
            : "Private",

        employment_type:
          isIrcon
            ? "Contract / Recruitment"
            : "Full-time",

        status:
          "Pending Review",

        published: false
      });

      result.inserted++;
    }
  } catch (error) {
    result.errors.push(
      error.message
    );
  }

  return result;
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

  if (
    CRON_SECRET &&
    req.headers.authorization !==
      `Bearer ${CRON_SECRET}`
  ) {
    return res.status(401).json({
      success: false,
      error:
        "Unauthorized"
    });
  }

  if (!SUPA || !SUPA_KEY) {
    return res.status(500).json({
      success: false,
      error:
        "Supabase environment variables missing"
    });
  }

  const started =
    new Date().toISOString();

  const results = [];

  /*
   * Run sequentially.
   * This is slower but much safer
   * for the Hobby function limit/time.
   */
  for (const source of SOURCES) {
    results.push(
      await processSource(
        source
      )
    );
  }

  const totals =
    results.reduce(
      (a, r) => {
        a.links += r.links;
        a.civil += r.civil;
        a.inserted += r.inserted;
        a.existing += r.existing;
        a.errors +=
          r.errors.length;

        return a;
      },
      {
        links: 0,
        civil: 0,
        inserted: 0,
        existing: 0,
        errors: 0
      }
    );

  return res.status(200).json({
    success: true,
    collector:
      "CivilCareer Unified Job Sync",
    started,
    finished:
      new Date().toISOString(),
    results,
    totals
  });
};
