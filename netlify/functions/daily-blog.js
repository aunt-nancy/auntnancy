// netlify/functions/daily-blog.js
// Scheduled daily — generates one AI blog article and saves to Supabase.
// Schedule defined in netlify.toml.

const SUPABASE_URL = 'https://vnfjszmhmcxkxegzvivg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_5s7SB5PmfKyHOSMKG6GCkA_s7Q_PLxG';

const TOPIC_BANK = {
  parent: [
    'Trauma-informed responses to common behaviors in foster children',
    'Managing the first 72 hours after a new placement',
    'When the bio family calls or texts — what to say and what to avoid',
    'Building a routine that helps a new placement feel safe',
    'Self-care for foster parents who can\'t leave the house easily',
    'Talking to school staff about a foster child\'s history',
    'Handling birthday and holiday triggers',
    'When a child rejects food — practical strategies',
    'Sibling visits: making them work',
    'Documenting incidents in a way that protects everyone',
  ],
  kinship: [
    'Telling other family members you\'re now the caregiver',
    'Setting boundaries with the bio parent when they\'re your relative',
    'Why becoming licensed kinship pays — even if it feels formal',
    'Navigating holidays when the family is split by a case',
    'Funding sources kinship caregivers often miss',
    'Custody vs. guardianship vs. adoption — explained simply',
    'How to bring up money worries with your CSW',
  ],
  youth: [
    'Using your ETV money strategically — what actually pays off',
    'Filing for emancipation: when it makes sense and when it doesn\'t',
    'Building credit before you age out',
    'Finding a therapist who actually gets foster youth',
    'ILP money: what you\'re owed and how to claim every dollar',
    'AB 12: staying in care past 18 — the unfiltered version',
    'College housing during breaks when you\'re a former foster youth',
  ],
  worker: [
    'When to recommend SCI Level 2 vs. Level 3',
    'BIRP log mistakes that get cases reopened',
    'Documenting family contact effectively for court',
    'Helping a caregiver who\'s about to quit',
    'Trauma-informed home visits — practical adjustments',
  ],
  all: [
    'This week\'s most important California foster care policy changes',
    'How recent court rulings affect your case',
    'New funding sources for foster families this quarter',
  ],
};

// Rotate audience by day of week
const DAY_AUDIENCE = ['parent','youth','kinship','worker','all','parent','youth'];

const AUDIENCE_EMOJI = {
  parent: '🏠', kinship: '👵', youth: '🌱', worker: '📋', all: '⭐'
};

function pickTopic(audience) {
  const list = TOPIC_BANK[audience] || TOPIC_BANK.all;
  // Use date as seed for deterministic-but-rotating selection
  const seed = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return list[seed % list.length];
}

function slugify(s) {
  return s.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 70);
}

async function callClaude(apiKey, system, prompt) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
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
  const data = await r.json();
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${data.error?.message || JSON.stringify(data)}`);
  return data.content?.[0]?.text || '';
}

async function generateArticle(audience) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const topic = pickTopic(audience);
  const audLabel = { parent: 'foster parents', kinship: 'kinship caregivers', youth: 'foster youth (ages 12-21)', worker: 'social workers and case workers', all: 'the foster care community' }[audience];

  const system = 'You are Aunt Nancy, a warm, direct, knowledgeable voice writing for the foster care community. You write practical, policy-cited, no-fluff articles that respect the reader\'s intelligence and time. Always respond with ONLY a valid JSON object — no markdown fences, no preamble, just the raw JSON.';

  const prompt = `Write a daily blog article for AuntNancy.org targeted at ${audLabel}.

Topic: "${topic}"

Requirements:
- 600-900 words
- Practical, specific, actionable tips — not generic advice
- Include 2-3 California-specific policy/law citations where relevant (DCFS, WIC, Ed Code, etc.)
- Warm but direct tone — no fluff, no excessive caveats
- Markdown formatting: use ## for section headers, ** for bold, - for lists
- End with one actionable takeaway

Return ONLY this JSON structure:
{
  "title": "Compelling 6-10 word title",
  "subtitle": "One-sentence hook (under 140 chars)",
  "body_md": "Full article in markdown, 600-900 words",
  "tags": ["array", "of", "3-5", "short", "tags"],
  "hero_emoji": "One emoji that fits the topic"
}`;

  const text = await callClaude(apiKey, system, prompt);
  const cleaned = text.replace(/```json|```/g, '').trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first === -1 || last === -1) throw new Error('No JSON in Claude response: ' + cleaned.substring(0, 200));
  const json = JSON.parse(cleaned.substring(first, last + 1));

  return {
    ...json,
    audience,
    source_type: 'ai',
    author_name: 'Aunt Nancy AI',
    status: 'published',
  };
}

async function saveToSupabase(post) {
  const dateStr = new Date().toISOString().substring(0, 10);
  const slug = `${slugify(post.title)}-${dateStr}`;

  const row = {
    slug,
    title: post.title,
    subtitle: post.subtitle || '',
    body_md: post.body_md,
    author_name: post.author_name,
    source_type: post.source_type,
    tags: post.tags || [],
    audience: post.audience,
    hero_emoji: post.hero_emoji || AUDIENCE_EMOJI[post.audience] || '📝',
    status: post.status,
    published_at: new Date().toISOString(),
  };

  const r = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(row),
  });

  const data = await r.json();
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${JSON.stringify(data)}`);
  return data;
}

exports.handler = async (event) => {
  // Optional manual trigger via GET ?force=1 for testing
  try {
    const day = new Date().getDay();
    const audience = DAY_AUDIENCE[day] || 'all';
    const post = await generateArticle(audience);
    const saved = await saveToSupabase(post);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, audience, title: post.title, slug: saved?.[0]?.slug, saved }),
    };
  } catch (err) {
    console.error('daily-blog error:', err.message, err.stack);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};

// Netlify scheduled function metadata (cron syntax: minute hour day month weekday)
// 14:00 UTC = 6:00 AM Pacific (during PDT). Adjust in netlify.toml if needed.
exports.config = {
  schedule: '0 14 * * *',
};
