module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const { job } = req.body;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHANNEL_ID;

  if (!token || !chatId || !job) {
    return res.status(400).json({ error: 'Missing config or job data' });
  }

  const isGovt = ['Government', 'Public Sector'].includes(job.sector);
  const emoji = isGovt ? '🏛' : '🏗';
  const deadline = job.deadline
    ? `\n⏳ *Last Date:* ${new Date(job.deadline + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : '';
  const salary   = job.salary         ? `\n💰 *Salary:* ${job.salary}`               : '';
  const vac      = job.vacancy_count   ? `\n📋 *Vacancies:* ${job.vacancy_count}`      : '';
  const qual     = job.qualification   ? `\n🎓 *Qualification:* ${job.qualification}`  : '';
  const exp      = job.experience_level? `\n🧑‍💼 *Experience:* ${job.experience_level}` : '';
  const loc      = job.location        ? job.location : 'Karnataka';

  const text =
    `${emoji} *New ${isGovt ? 'Govt' : 'Civil'} Job Alert\\!*\n\n` +
    `*${(job.role || 'Opportunity').replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&')}*\n` +
    `🏢 ${(job.company || job.recruitment_authority || 'See official source').replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&')}\n` +
    `📍 ${loc.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&')}` +
    salary + vac + qual + exp + deadline +
    `\n\n🔗 [View & Apply](https://civilcareer-india-two.vercel.app/${isGovt ? 'government-jobs' : 'private-jobs'})` +
    `\n\n_Never pay for a job\\. Always verify the official notification\\._`;

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: false
      })
    });

    const data = await r.json();
    if (!data.ok) return res.status(500).json({ error: data.description });
    return res.status(200).json({ success: true, message_id: data.result.message_id });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
