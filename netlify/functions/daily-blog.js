// netlify/functions/daily-blog.js
// Before July 1 2026: posts up to 4x/day on different topics/audiences
// After July 1 2026:  posts once per day only
// Duplicate prevention: checks Supabase before inserting

const SUPABASE_URL = 'https://vnfjszmhmcxkxegzvivg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_5s7SB5PmfKyHOSMKG6GCkA_s7Q_PLxG';
const CUTOFF_DATE  = new Date('2026-07-01T00:00:00Z');

// ── Topic banks ────────────────────────────────────────────────────────────────
const EVERGREEN = {
  parent: [
    'Trauma-informed responses to common behaviors in foster children',
    'Managing the first 72 hours after a new placement',
    'When the bio family calls or texts — what to say and what to avoid',
    'Building a routine that helps a new placement feel safe',
    'Self-care for foster parents who cannot leave the house easily',
    'Talking to school staff about a foster child\'s history',
    'Handling birthday and holiday triggers in foster care',
    'When a child rejects food — practical strategies',
    'Sibling visits: making them work for everyone',
    'Documenting incidents in a way that protects everyone',
    'Understanding WIC 16001.9 — your foster child\'s rights in plain language',
    'Getting clothing allowance approved the first time',
  ],
  kinship: [
    'Telling other family members you are now the caregiver',
    'Setting boundaries with the bio parent when they are your relative',
    'Why becoming licensed kinship pays — even if it feels formal',
    'Navigating holidays when the family is split by a case',
    'Funding sources kinship caregivers often miss',
    'Custody vs. guardianship vs. adoption — explained simply',
    'How to raise money concerns with your CSW without conflict',
    'When DCFS asks you to become the placement — what to know before you say yes',
  ],
  youth: [
    'Using your ETV money strategically — what actually pays off',
    'Building credit before you age out of foster care',
    'Finding a therapist who actually gets foster youth',
    'ILP money: what you are owed and how to claim every dollar',
    'AB 12: staying in care past 18 — the unfiltered version',
    'College housing during breaks when you are a former foster youth',
    'Medi-Cal continues to age 26 — how to keep it active',
    'Your rights under WIC 16001.9 — explained in plain language',
  ],
  worker: [
    'When to recommend SCI Level 2 vs. Level 3',
    'BIRP log mistakes that get cases reopened',
    'Documenting family contact effectively for court',
    'Helping a caregiver who is about to give up',
    'Trauma-informed home visits — practical adjustments',
    'How to explain AB 12 to youth who are approaching 18',
    'Kinship placement: the first conversation that sets the tone',
  ],
  all: [
    'How the DCFS system works — a plain-language map',
    'What every person in the foster care system deserves to know',
    'Foster care and education: rights, protections, and what to do when schools fail',
  ],
};

// Timely topics: only suggested when the current month matches
const TIMELY = [
  { months:[1,2],    audience:'youth',   topic:'FAFSA and the Foster Youth Fee Waiver — deadline is coming, here is what to do right now' },
  { months:[1,2],    audience:'parent',  topic:'IEP season is starting — what foster parents need to do before the meeting' },
  { months:[3,4,5],  audience:'youth',   topic:'Chafee scholarship deadlines this spring — apply before the money runs out' },
  { months:[3,4,5],  audience:'parent',  topic:'School enrollment rights for foster children — McKinney-Vento reminder before the year ends' },
  { months:[4,5,6],  audience:'youth',   topic:'AB 12 open enrollment closes June 30 — is your youth enrolled before the deadline?' },
  { months:[4,5,6],  audience:'kinship', topic:'Kinship support payments — mid-year check to make sure you are receiving everything you qualify for' },
  { months:[6],      audience:'youth',   topic:'Aging out this summer — the 30-day checklist every foster youth needs' },
  { months:[8,9],    audience:'parent',  topic:'Back to school for foster children — enrollment rights, transportation, and records you need' },
  { months:[9,10],   audience:'youth',   topic:'FAFSA opens October 1 — foster youth should file the first day' },
  { months:[10,11],  audience:'parent',  topic:'Holiday planning for foster children — preparing for triggers and making memories' },
  { months:[11,12],  audience:'kinship', topic:'Year-end benefits check — kinship allowances and supports you may have missed' },
  { months:[12,1],   audience:'worker',  topic:'January court calendar — what social workers need to prepare before hearings resume' },
];

// Audience rotation per run slot (4 runs/day = indices 0-3)
const SLOT_AUDIENCE = ['parent','youth','kinship','worker'];

// ── Helpers ────────────────────────────────────────────────────────────────────
function pickTopic(audience, slot) {
  const now    = new Date();
  const month  = now.getMonth() + 1;
  const timely = TIMELY.filter(t => t.audience === audience && t.months.includes(month));
  if (timely.length) return timely[Math.floor(Math.random() * timely.length)].topic;
  const list = EVERGREEN[audience] || EVERGREEN.all;
  const seed  = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) + slot;
  return list[seed % list.length];
}

function slugify(s) {
  return s.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 70);
}

async function supabaseFetch(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

// Returns true if this audience already has a post today
async function alreadyPostedToday(audience) {
  const today = new Date().toISOString().substring(0, 10);
  const rows = await supabaseFetch(
    `blog_posts?source_type=eq.ai&audience=eq.${audience}&published_at=gte.${today}T00:00:00Z&limit=1`,
    { method: 'GET' }
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function countTodaysPosts() {
  const today = new Date().toISOString().substring(0, 10);
  const rows = await supabaseFetch(
    `blog_posts?source_type=eq.ai&published_at=gte.${today}T00:00:00Z`,
    { method: 'GET' }
  );
  return Array.isArray(rows) ? rows.length : 0;
}

async function callClaude(apiKey, system, prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2200,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${data.error?.message}`);
  return data.content?.[0]?.text || '';
}

async function generateAndSave(audience, slot) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  // Skip if this audience already has a post today
  if (await alreadyPostedToday(audience)) {
    return { skipped: true, reason: `${audience} already posted today` };
  }

  const topic    = pickTopic(audience, slot);
  const audLabel = {
    parent:  'foster parents',
    kinship: 'kinship caregivers',
    youth:   'foster youth (ages 12–21)',
    worker:  'social workers and case workers',
    all:     'the foster care community',
  }[audience] || 'foster care community';

  const system =
    'You are Aunt Nancy — warm, direct, knowledgeable. Write for the foster care community. ' +
    'Respond with ONLY a valid JSON object. No markdown fences, no preamble.';

  const prompt =
    `Write a blog article for AuntNancy.org for ${audLabel}.\n\n` +
    `Topic: "${topic}"\n\n` +
    `Requirements:\n` +
    `- 600–900 words\n` +
    `- Practical, actionable — not generic\n` +
    `- 2–3 California policy/law citations (DCFS, WIC, Ed Code, AB 12, etc.) where relevant\n` +
    `- Warm but direct tone\n` +
    `- Markdown: ## headers, ** bold, - lists\n` +
    `- End with one clear actionable takeaway\n\n` +
    `Return ONLY this JSON:\n` +
    `{"title":"6–10 word title","subtitle":"one-sentence hook under 140 chars","body_md":"full article","tags":["3–5 tags"],"hero_emoji":"one emoji"}`;

  const raw     = await callClaude(apiKey, system, prompt);
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const first   = cleaned.indexOf('{');
  const last    = cleaned.lastIndexOf('}');
  if (first === -1 || last === -1) throw new Error('No JSON from Claude: ' + cleaned.substring(0, 150));
  const article = JSON.parse(cleaned.substring(first, last + 1));

  const dateStr = new Date().toISOString().substring(0, 10);
  const slug    = `${slugify(article.title)}-${audience}-${dateStr}-${slot}`;

  const saved = await supabaseFetch('blog_posts', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      slug,
      title:       article.title,
      subtitle:    article.subtitle || '',
      body_md:     article.body_md,
      author_name: 'Aunt Nancy',
      source_type: 'ai',
      tags:        article.tags || [],
      audience,
      hero_emoji:  article.hero_emoji || '📝',
      status:      'published',
      published_at: new Date().toISOString(),
    }),
  });

  return { ok: true, audience, title: article.title, slug };
}

// ── Handler ────────────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const now          = new Date();
    const afterCutoff  = now >= CUTOFF_DATE;
    const hour         = now.getUTCHours();

    // Determine which slot this run is (maps to audience)
    // Runs at UTC 14,18,22,2 → slots 0,1,2,3
    const SLOT_HOURS = [14, 18, 22, 2];
    const slot       = SLOT_HOURS.indexOf(hour);
    const slotIdx    = slot === -1 ? 0 : slot;
    const audience   = SLOT_AUDIENCE[slotIdx];

    if (afterCutoff) {
      // After July 1: post once per day total regardless of audience
      const todayCount = await countTodaysPosts();
      if (todayCount >= 1) {
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, skipped: true, reason: 'Already posted today (post-cutoff mode)' }) };
      }
    }

    const result = await generateAndSave(audience, slotIdx);
    return { statusCode: 200, headers, body: JSON.stringify(result) };

  } catch (err) {
    console.error('daily-blog error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};

exports.config = { schedule: '0 14,18,22,2 * * *' };
