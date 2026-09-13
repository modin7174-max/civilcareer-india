/**
 * CivilCareer India — Jobs API
 * Handles:
 *   GET    public jobs / admin jobs
 *   POST   create job
 *   PATCH  update job
 *   DELETE delete job
 */

const SUPA = process.env.SUPABASE_URL;
const KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

const OWNER_KEY = process.env.OWNER_KEY;

const FIELDS = [
  'source_url',
  'role',
  'company',
  'location',
  'description',
  'responsibilities',
  'skills',

  'employment_type',
  'employment_types',

  'salary',
  'salary_min',
  'salary_max',
  'salary_currency',

  'sector',
  'discipline',
  'experience_level',
  'experience_min',
  'experience_max',
  'experience_ranges',

  'deadline',
  'application_start',

  'qualification',
  'qualifications',
  'qualification_notes',

  'application_method',
  'application_email',
  'application_emails',
  'application_email_private',

  'application_url',
  'apply_url',
  'company_url',

  'country',
  'state',
  'district',
  'city',
  'location_display',
  'locations',

  'role_category',
  'role_normalized',

  'vacancy_count',
  'age_limit',
  'application_fee',
  'recruitment_authority',

  'posted_at',
  'published_at',
  'expires_at',
  'verification_status',
  'last_verified_at',
  'last_verified',
  'updated_at',

  'featured',
  'status',
  'published',
  'slug'
];

const ARRAY_FIELDS = new Set([
  'locations',
  'qualifications',
  'experience_ranges',
  'employment_types',
  'application_emails'
]);

function responseError(res, status, message, details = null) {
  return res.status(status).json({
    error: message,
    ...(details ? { details } : {})
  });
}

function parseBody(req) {
  if (!req.body) return {};

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      throw new Error('Invalid JSON body');
    }
  }

  return req.body;
}

function pick(body) {
  const out = {};

  for (const field of FIELDS) {
    if (body[field] === undefined) continue;

    let value = body[field];

    if (ARRAY_FIELDS.has(field)) {
      if (typeof value === 'string') {
        try {
          value = JSON.parse(value);
        } catch {
          value = value
            .split(',')
            .map(x => x.trim())
            .filter(Boolean);
        }
      }

      if (!Array.isArray(value)) {
        value = [];
      }
    }

    out[field] = value;
  }

  return out;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function makeSlug(body) {
  const base = slugify(
    `${body.role || 'job'}-${body.company || 'company'}`
  );

  const suffix = Math.random()
    .toString(36)
    .slice(2, 8);

  return `${base || 'job'}-${suffix}`;
}

function isOwner(req, body = {}) {
  const key =
    req.headers['x-owner-key'] ||
    body.key;

  return Boolean(OWNER_KEY && key === OWNER_KEY);
}

function supa(path, opts = {}) {
  if (!SUPA || !KEY) {
    throw new Error(
      'Supabase server environment variables are not configured'
    );
  }

  return fetch(`${SUPA}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      ...opts.headers
    }
  });
}

async function readError(r) {
  try {
    const text = await r.text();
    return text || `HTTP ${r.status}`;
  } catch {
    return `HTTP ${r.status}`;
  }
}

async function expireJobs() {
  const now = new Date().toISOString();

  try {
    await supa(
      `jobs?published=eq.true&expires_at=lt.${encodeURIComponent(now)}`,
      {
        method: 'PATCH',
        headers: {
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({
          published: false,
          status: 'Expired',
          updated_at: now
        })
      }
    );
  } catch {
    // Expiry is housekeeping.
    // Do not prevent normal reads if it fails.
  }
}

async function checkDuplicate(body, excludeId = null) {
  const sourceUrl = String(body.source_url || '').trim();

  if (!sourceUrl && !body.role && !body.company) {
    return null;
  }

  let query =
    'jobs?select=id,role,company,source_url,status,published';

  const filters = [];

  if (sourceUrl) {
    filters.push(`source_url=eq.${encodeURIComponent(sourceUrl)}`);
  }

  if (body.role && body.company) {
    filters.push(
      `role=ilike.${encodeURIComponent(body.role)}`,
      `company=ilike.${encodeURIComponent(body.company)}`
    );
  }

  if (!filters.length) return null;

  for (const filter of filters) {
    let path = `jobs?select=id,role,company,source_url,status,published&${filter}`;

    if (excludeId) {
      path += `&id=neq.${encodeURIComponent(excludeId)}`;
    }

    const r = await supa(path);

    if (!r.ok) continue;

    const rows = await r.json();

    if (rows.length) {
      return rows[0];
    }
  }

  return null;
}

module.exports = async function handler(req, res) {
  try {
    /*
     * ----------------------------------------------------------
     * GET
     * ----------------------------------------------------------
     *
     * Public:
     *   returns active published jobs only.
     *
     * Admin:
     *   x-owner-key returns all jobs.
     */

    if (req.method === 'GET') {
      await expireJobs();

      const ownerKey =
        req.headers['x-owner-key'] ||
        req.query?.key;

      const admin =
        OWNER_KEY &&
        ownerKey === OWNER_KEY;

      let path;

      if (admin) {
        path =
          'jobs?order=created_at.desc';
      } else {
        path =
          'jobs?' +
          'published=eq.true' +
          '&status=eq.Active' +
          '&or=(expires_at.is.null,expires_at.gt.' +
          encodeURIComponent(new Date().toISOString()) +
          ')' +
          '&order=featured.desc,published_at.desc,created_at.desc';
      }

      const slug = req.query?.slug;

      if (slug) {
        path =
          `jobs?slug=eq.${encodeURIComponent(slug)}`;

        if (!admin) {
          path +=
            '&published=eq.true&status=eq.Active';
        }

        path += '&limit=1';
      }

      const r = await supa(path);

      if (!r.ok) {
        return responseError(
          res,
          500,
          'Failed to load jobs',
          await readError(r)
        );
      }

      const jobs = await r.json();

      return res.status(200).json({
        jobs
      });
    }

    /*
     * ----------------------------------------------------------
     * WRITE AUTHENTICATION
     * ----------------------------------------------------------
     */

    let body;

    try {
      body = parseBody(req);
    } catch (err) {
      return responseError(
        res,
        400,
        err.message
      );
    }

    if (!isOwner(req, body)) {
      return responseError(
        res,
        401,
        'Unauthorized'
      );
    }

    /*
     * ----------------------------------------------------------
     * POST — CREATE
     * ----------------------------------------------------------
     */

    if (req.method === 'POST') {
      delete body.id;
      delete body.key;

      const job = pick(body);

      /*
       * URL is intentionally OPTIONAL.
       * Role is the minimum useful identification.
       */
      if (!String(job.role || '').trim()) {
        return responseError(
          res,
          400,
          'Job title/role is required'
        );
      }

      /*
       * Duplicate protection.
       */
      const duplicate =
        await checkDuplicate(job);

      if (duplicate && body.confirm_duplicate !== true) {
        return responseError(
          res,
          409,
          'A similar job already exists',
          duplicate
        );
      }

      const now =
        new Date().toISOString();

      job.published =
        body.published === false
          ? false
          : true;

      job.status =
        body.status ||
        (job.published ? 'Active' : 'Draft');

      job.posted_at =
        job.posted_at ||
        now;

      if (job.published) {
        job.published_at =
          job.published_at ||
          now;
      }

      job.updated_at = now;

      job.role_normalized =
        job.role_normalized ||
        String(job.role)
          .trim()
          .toLowerCase();

      job.location_display =
        job.location_display ||
        job.location ||
        [job.city, job.state, job.country]
          .filter(Boolean)
          .join(', ');

      job.country =
        job.country ||
        'India';

      /*
       * Default lifecycle:
       *
       * Government/recruitment jobs:
       * expire around their deadline.
       *
       * Other jobs:
       * expire after 30 days.
       */

      if (!job.expires_at) {
        if (job.deadline) {
          job.expires_at =
            `${job.deadline}T23:59:59+05:30`;
        } else {
          const expiry =
            new Date(
              Date.now() +
              30 * 24 * 60 * 60 * 1000
            );

          job.expires_at =
            expiry.toISOString();
        }
      }

      job.verification_status =
        job.verification_status ||
        'unverified';

      job.slug =
        job.slug ||
        makeSlug(job);

      const r = await supa('jobs', {
        method: 'POST',
        headers: {
          Prefer: 'return=representation'
        },
        body: JSON.stringify(job)
      });

      if (!r.ok) {
        return responseError(
          res,
          500,
          'Job could not be saved',
          await readError(r)
        );
      }

      const data = await r.json();

      return res.status(201).json({
        success: true,
        job: data[0]
      });
    }

    /*
     * ----------------------------------------------------------
     * PATCH — UPDATE
     * ----------------------------------------------------------
     */

    if (req.method === 'PATCH') {
      const id = body.id;

      if (!id) {
        return responseError(
          res,
          400,
          'Missing job id'
        );
      }

      delete body.id;
      delete body.key;

      const job = pick(body);

      job.updated_at =
        new Date().toISOString();

      if (job.role) {
        job.role_normalized =
          job.role_normalized ||
          String(job.role)
            .trim()
            .toLowerCase();
      }

      if (job.published === true) {
        job.published_at =
          job.published_at ||
          new Date().toISOString();

        job.status =
          job.status ||
          'Active';
      }

      const r = await supa(
        `jobs?id=eq.${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          headers: {
            Prefer: 'return=representation'
          },
          body: JSON.stringify(job)
        }
      );

      if (!r.ok) {
        return responseError(
          res,
          500,
          'Job update failed',
          await readError(r)
        );
      }

      const data = await r.json();

      return res.status(200).json({
        success: true,
        job: data[0] || null
      });
    }

    /*
     * ----------------------------------------------------------
     * DELETE
     * ----------------------------------------------------------
     */

    if (req.method === 'DELETE') {
      const id =
        body.id ||
        req.query?.id;

      if (!id) {
        return responseError(
          res,
          400,
          'Missing job id'
        );
      }

      const r = await supa(
        `jobs?id=eq.${encodeURIComponent(id)}`,
        {
          method: 'DELETE',
          headers: {
            Prefer: 'return=representation'
          }
        }
      );

      if (!r.ok) {
        return responseError(
          res,
          500,
          'Job deletion failed',
          await readError(r)
        );
      }

      return res.status(200).json({
        success: true
      });
    }

    return responseError(
      res,
      405,
      'Method not allowed'
    );

  } catch (err) {
    console
