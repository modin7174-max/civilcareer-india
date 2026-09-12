/**
 * CivilCareer — Job Alert Subscription API
 * File: api/subscribe.js
 *
 * ✅ Uses Supabase instead of Notion (free forever, no trial expiry)
 *
 * Stack:
 *   Subscriber storage → Supabase   (supabase.com — free forever, no limits)
 *   Email alerts       → Resend     (3,000 emails/month free)
 *   WhatsApp alerts    → Green API  (optional, 100 sessions/month free)
 *
 * Environment variables to add in Vercel:
 *   SUPABASE_URL          → https://xxxx.supabase.co   (from Supabase Settings → API)
 *   SUPABASE_SERVICE_KEY  → service_role key            (from Supabase Settings → API)
 *   RESEND_API_KEY        → re_xxxx                     (from resend.com dashboard)
 *   GREENAPI_INSTANCE_ID  → optional, for WhatsApp
 *   GREENAPI_TOKEN        → optional, for WhatsApp
 */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, phone, preference } = req.body;

  // Validate
  if (preference === "email" && !isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email address" });
  }
  if (preference === "whatsapp" && !isValidPhone(phone)) {
    return res.status(400).json({ error: "Invalid phone number" });
  }

  try {
    // 1. Save to Supabase
    await saveToSupabase({ email, phone, preference });

    // 2. Send welcome message
    if (preference === "email") {
      await sendWelcomeEmail(email);
    } else {
      await sendWhatsAppWelcome(phone);
    }

    return res.status(200).json({ success: true, message: "Subscribed!" });
  } catch (err) {
    console.error("Subscription error:", err);
    return res.status(500).json({ error: "Subscription failed. Try again." });
  }
}

// ── Validate email ─────────────────────────────────────────────────
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");
}

// ── Validate Indian mobile number ─────────────────────────────────
function isValidPhone(phone) {
  return /^[6-9]\d{9}$/.test(phone || "");
}

// ── Supabase: Save subscriber ──────────────────────────────────────
async function saveToSupabase({ email, phone, preference }) {
  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/subscribers`,
    {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        email: email || null,
        phone: phone ? `+91${phone}` : null,
        preference: preference === "whatsapp" ? "WhatsApp" : "Email",
        subscribed_at: new Date().toISOString(),
        active: true,
      }),
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Supabase save failed: ${errText}`);
  }
}

// ── Resend: Send welcome email ─────────────────────────────────────
async function sendWelcomeEmail(to) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "CivilCareer <alerts@civilcareer.in>",
      to: [to],
      subject: "✅ Job alerts activated — CivilCareer",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;">
          <h2 style="color:#0b1f3a">You're subscribed to CivilCareer alerts 🎉</h2>
          <p>You'll receive email notifications whenever new <strong>civil engineering</strong>
          or <strong>Karnataka government jobs</strong> are posted.</p>
          <hr style="border:0.5px solid #e4e8f0;margin:20px 0;">
          <p style="font-size:13px;color:#5a6478;">
            <strong>Remember:</strong> Never pay for a job. Always verify with the
            official notification before applying.
          </p>
          <p style="font-size:12px;color:#9aa5b8;">
            To unsubscribe, reply with "UNSUBSCRIBE" in the subject line.
          </p>
        </div>
      `,
    }),
  });
  if (!res.ok) throw new Error("Email send failed");
}

// ── Green API: Send WhatsApp welcome message ───────────────────────
async function sendWhatsAppWelcome(phone) {
  const instanceId = process.env.GREENAPI_INSTANCE_ID;
  const token = process.env.GREENAPI_TOKEN;
  // Skip silently if WhatsApp is not configured
  if (!instanceId || !token) return;

  const chatId = `91${phone}@c.us`;
  const res = await fetch(
    `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId,
        message:
          `✅ *CivilCareer Job Alerts Activated!*\n\n` +
          `You'll receive notifications for new civil engineering & Karnataka govt jobs.\n\n` +
          `🔗 Browse jobs: https://civilcareer-india.vercel.app\n\n` +
          `⚠️ _Never pay for a job. Always verify the original notification._\n\n` +
          `Reply STOP to unsubscribe.`,
      }),
    }
  );
  if (!res.ok) throw new Error("WhatsApp send failed");
}

// ── Send job alert to all active subscribers ───────────────────────
// Call this from your job-import flow after a new job is published
export async function sendJobAlert(job) {
  const subscribers = await getActiveSubscribers();

  const emailBatch = subscribers
    .filter((s) => s.preference === "Email" && s.email)
    .map((s) => s.email);

  const whatsappBatch = subscribers
    .filter((s) => s.preference === "WhatsApp" && s.phone)
    .map((s) => s.phone);

  // Resend batch (max 100 per call on free plan)
  if (emailBatch.length > 0) {
    await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        emailBatch.slice(0, 100).map((to) => ({
          from: "CivilCareer <alerts@civilcareer.in>",
          to: [to],
          subject: `🆕 ${job.title} — ${job.company || job.dept}`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;">
              <h3 style="color:#0b1f3a">🆕 New Job Alert</h3>
              <p><strong>${job.title}</strong><br>
              ${job.company || job.dept} · ${job.location || "Karnataka"}</p>
              ${job.salary ? `<p>💰 ${job.salary}</p>` : ""}
              <a href="${job.url}" style="display:inline-block;background:#0b1f3a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">
                View & Apply →
              </a>
              <p style="font-size:12px;color:#9aa5b8;margin-top:20px;">
                ⚠️ Never pay for a job. Always verify the official notification.
              </p>
            </div>
          `,
        }))
      ),
    });
  }

  // WhatsApp (rate-limited — 1 second between sends)
  for (const phone of whatsappBatch.slice(0, 50)) {
    await sendWhatsAppWelcome(phone);
    await new Promise((r) => setTimeout(r, 1000));
  }
}

// ── Supabase: Get all active subscribers ──────────────────────────
async function getActiveSubscribers() {
  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/subscribers?active=eq.true&select=email,phone,preference`,
    {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      },
    }
  );
  if (!res.ok) throw new Error("Failed to fetch subscribers from Supabase");
  return res.json();
}
