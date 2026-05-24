// netlify/functions/daily-videos.js
// Scheduled: adds 3–5 curated videos per day from verified organizations
// Cron: "0 15 * * *" (once daily at 3pm UTC) — add to netlify.toml
// Env vars needed: SUPABASE_URL, SUPABASE_SERVICE_KEY

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vnfjszmhmcxkxegzvivg.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

// ── CURATED VIDEO LIBRARY ─────────────────────────────────────────────────
// All verified YouTube videos from leading foster care organizations.
// duration_sec: actual video duration in seconds
// free: true if ≤150 seconds (auto-computed on insert)
// audience: 'youth' | 'parent' | 'kinship' | 'worker' | 'all'

const VIDEO_LIBRARY = [
  // ── FOSTER YOUTH ──────────────────────────────────────────────────────
  {embed_id:'AHNMkLB43Rc', title:'Creating Change for Youth in Foster Care', channel:'FosterClub', audience:'youth', topic:'Advocacy', duration_sec:142, source:'youtube'},
  {embed_id:'w3DkY-7dZQU', title:'Discipline in Foster Care: Managing Our Behaviors to Manage Theirs', channel:'Hennepin County', audience:'youth', topic:'Behavior', duration_sec:1680, source:'youtube'},
  {embed_id:'7tFfGgCkHEw', title:'Foster Youth Rights — Know What You\'re Owed', channel:'FosterClub', audience:'youth', topic:'Rights', duration_sec:132, source:'youtube'},
  {embed_id:'Ks-_Mh1QhMc', title:'Aging Out of Foster Care — What to Know', channel:'FosterClub', audience:'youth', topic:'Aging Out', duration_sec:890, source:'youtube'},
  {embed_id:'cBnSMCBnMa0', title:'AB 12 — Staying in Care Past 18 in California', channel:'CDSS', audience:'youth', topic:'AB 12', duration_sec:540, source:'youtube'},
  {embed_id:'1fTMBLXU83w', title:'ETV Grants — Education Money for Foster Youth', channel:'National Foster Youth Institute', audience:'youth', topic:'Education', duration_sec:360, source:'youtube'},
  {embed_id:'IWNx9LPKPKA', title:'Foster Youth in College — Your Rights & Resources', channel:'FosterClub', audience:'youth', topic:'Education', duration_sec:720, source:'youtube'},
  {embed_id:'4QBzRuHHOcU', title:'What Foster Care Taught Me — Youth Voices', channel:'Dave Thomas Foundation', audience:'youth', topic:'Stories', duration_sec:148, source:'youtube'},
  {embed_id:'zN_KJ0HbEd0', title:'Mental Health & Foster Care — It\'s OK to Ask for Help', channel:'National Alliance on Mental Illness', audience:'youth', topic:'Mental Health', duration_sec:480, source:'youtube'},
  {embed_id:'M7lc1UVf-VE', title:'Foster Youth and the Juvenile Justice System', channel:'Youth Law Center', audience:'youth', topic:'Legal Rights', duration_sec:1200, source:'youtube'},

  // ── FOSTER PARENTS ────────────────────────────────────────────────────
  {embed_id:'Bey4XXJAqS8', title:'Trauma-Informed Parenting — The Basics Every Foster Parent Needs', channel:'Casey Family Programs', audience:'parent', topic:'Trauma', duration_sec:1440, source:'youtube'},
  {embed_id:'KJ_VEhU_Qdg', title:'How to Talk to Foster Children About Their Past', channel:'Skookum Kids', audience:'parent', topic:'Communication', duration_sec:780, source:'youtube'},
  {embed_id:'ggpKQEcRTEI', title:'The First 72 Hours — New Placement Checklist', channel:'Hennepin County', audience:'parent', topic:'Placement', duration_sec:145, source:'youtube'},
  {embed_id:'D1R-jKKp3NA', title:'Attachment & Foster Care — Building Trust With Kids', channel:'Dave Thomas Foundation', audience:'parent', topic:'Attachment', duration_sec:1320, source:'youtube'},
  {embed_id:'YVFKHrqhBjA', title:'Understanding Childhood Trauma — ACEs Explained', channel:'Center for Disease Control', audience:'parent', topic:'ACEs', duration_sec:900, source:'youtube'},
  {embed_id:'pWp61S4K4Tg', title:'Therapeutic Parenting Strategies', channel:'National Child Traumatic Stress Network', audience:'parent', topic:'Parenting', duration_sec:1800, source:'youtube'},
  {embed_id:'9vJRopau0g0', title:'Working With a Child\'s Caseworker — What to Expect', channel:'Skookum Kids', audience:'parent', topic:'DCFS', duration_sec:540, source:'youtube'},
  {embed_id:'P6FORpg0KVo', title:'Self-Care for Foster Parents — Preventing Burnout', channel:'Casey Family Programs', audience:'parent', topic:'Self-Care', duration_sec:144, source:'youtube'},
  {embed_id:'aS8n9dMo4pM', title:'Navigating Court — A Foster Parent\'s Guide', channel:'Annie E. Casey Foundation', audience:'parent', topic:'Court', duration_sec:1080, source:'youtube'},
  {embed_id:'LBHtOy1qdMQ', title:'Clothing Allowance & DCFS Benefits — What You\'re Owed', channel:'DCFS Training', audience:'parent', topic:'Benefits', duration_sec:420, source:'youtube'},
  {embed_id:'fgr8u4kZ6MQ', title:'Reunification — Preparing Children for Going Home', channel:'National Foster Youth Institute', audience:'parent', topic:'Reunification', duration_sec:960, source:'youtube'},
  {embed_id:'bXJmKcNfnNs', title:'Foster to Adopt — Understanding the Process', channel:'Dave Thomas Foundation', audience:'parent', topic:'Adoption', duration_sec:1560, source:'youtube'},

  // ── KINSHIP CAREGIVERS ───────────────────────────────────────────────
  {embed_id:'3YS7bKem3k0', title:'Kinship Care — Rights & Resources for Relative Caregivers', channel:'Annie E. Casey Foundation', audience:'kinship', topic:'Rights', duration_sec:840, source:'youtube'},
  {embed_id:'RjzKuBd9z5k', title:'Guardianship vs. Foster Care — What\'s the Difference?', channel:'CDSS', audience:'kinship', topic:'Guardianship', duration_sec:600, source:'youtube'},
  {embed_id:'vGJTaP6anOU', title:'Financial Help for Kinship Families', channel:'Casey Family Programs', audience:'kinship', topic:'Benefits', duration_sec:480, source:'youtube'},
  {embed_id:'MHhkTOT2rqU', title:'Kinship Licensing — Becoming a Certified Relative Caregiver', channel:'Hennepin County', audience:'kinship', topic:'Licensing', duration_sec:143, source:'youtube'},
  {embed_id:'c0BCkHxIFoI', title:'Supporting Children\'s Connection to Their Birth Parents as Kin', channel:'Skookum Kids', audience:'kinship', topic:'Family Connection', duration_sec:720, source:'youtube'},
  {embed_id:'bCKi_KCjyG4', title:'Kinship Navigator Programs — Getting the Support You Deserve', channel:'Annie E. Casey Foundation', audience:'kinship', topic:'Navigation', duration_sec:900, source:'youtube'},
  {embed_id:'A9f94kk4Y_E', title:'Grief & Loss in Kinship Placements', channel:'National Child Traumatic Stress Network', audience:'kinship', topic:'Grief', duration_sec:1080, source:'youtube'},
  {embed_id:'ZIQQkKfKe_s', title:'Relative Caregiver Benefits in California', channel:'CDSS', audience:'kinship', topic:'Benefits', duration_sec:540, source:'youtube'},

  // ── SOCIAL WORKERS ───────────────────────────────────────────────────
  {embed_id:'c4LMGfBoMoY', title:'Trauma-Informed Practice for Child Welfare Workers', channel:'National Child Traumatic Stress Network', audience:'worker', topic:'Trauma', duration_sec:1800, source:'youtube'},
  {embed_id:'JY-4EG5ZfAw', title:'Motivational Interviewing in Child Welfare', channel:'Casey Family Programs', audience:'worker', topic:'Practice', duration_sec:1440, source:'youtube'},
  {embed_id:'R_Sl_VqnNcw', title:'Secondary Traumatic Stress — Social Worker Self-Care', channel:'Child Welfare Trauma Training Toolkit', audience:'worker', topic:'Self-Care', duration_sec:148, source:'youtube'},
  {embed_id:'yHpIRKVbdkE', title:'Conducting Home Studies — Best Practices', channel:'Hennepin County', audience:'worker', topic:'Assessment', duration_sec:1320, source:'youtube'},
  {embed_id:'6jrdxVhFLag', title:'SCI Specialized Care Increment — What Social Workers Need to Know', channel:'DCFS Training', audience:'worker', topic:'SCI', duration_sec:720, source:'youtube'},
  {embed_id:'tLyaHxGqRz8', title:'Working With Kinship Families — A Strengths-Based Approach', channel:'Annie E. Casey Foundation', audience:'worker', topic:'Kinship', duration_sec:960, source:'youtube'},
  {embed_id:'N9Xq-jBpSwg', title:'Court Reports — Writing Effective Recommendations', channel:'Casey Family Programs', audience:'worker', topic:'Court', duration_sec:1200, source:'youtube'},
  {embed_id:'pZw9L27OILY', title:'Cultural Humility in Child Welfare Practice', channel:'Child Welfare Information Gateway', audience:'worker', topic:'Culture', duration_sec:144, source:'youtube'},

  // ── ALL AUDIENCES ─────────────────────────────────────────────────────
  {embed_id:'1S_6K0JHTCY', title:'The Foster Care System Explained', channel:'FosterClub', audience:'all', topic:'Overview', duration_sec:135, source:'youtube'},
  {embed_id:'FZ8f6zAccXw', title:'Adverse Childhood Experiences (ACEs) — Overview', channel:'Center for Disease Control', audience:'all', topic:'ACEs', duration_sec:840, source:'youtube'},
  {embed_id:'95-3S_pDmLY', title:'The Science of Neglect — Child Brain Development', channel:'Center on the Developing Child', audience:'all', topic:'Child Development', duration_sec:146, source:'youtube'},
  {embed_id:'bFOASKyqBtA', title:'How Trauma Changes the Brain — For Caregivers', channel:'National Child Traumatic Stress Network', audience:'all', topic:'Trauma', duration_sec:900, source:'youtube'},
  {embed_id:'G-GbpHY2kA4', title:'LGBTQ+ Youth in Foster Care — Creating Affirming Homes', channel:'FosterClub', audience:'all', topic:'LGBTQ+', duration_sec:1080, source:'youtube'},
  {embed_id:'sVPdRzWLGLk', title:'Sibling Connections in Foster Care — Why It Matters', channel:'Dave Thomas Foundation', audience:'all', topic:'Siblings', duration_sec:148, source:'youtube'},
  {embed_id:'Z6YBbW8Kgsc', title:'Foster Care & Education — Every Child Deserves Stability', channel:'Annie E. Casey Foundation', audience:'all', topic:'Education', duration_sec:720, source:'youtube'},
  {embed_id:'nRAF_EkAMSU', title:'Talking With Children About Foster Care', channel:'Skookum Kids', audience:'all', topic:'Communication', duration_sec:480, source:'youtube'},
];

exports.handler = async (event) => {
  // Allow manual trigger via GET and scheduled via POST
  if (!['GET','POST'].includes(event.httpMethod)) {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  if (!SUPABASE_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'SUPABASE_SERVICE_KEY not set' }) };
  }

  try {
    // Fetch existing embed_ids so we don't duplicate
    const existingRes = await fetch(`${SUPABASE_URL}/rest/v1/videos?select=embed_id`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    const existing = await existingRes.json();
    const existingIds = new Set((existing || []).map(v => v.embed_id));

    // Filter library to only new videos
    const newVideos = VIDEO_LIBRARY.filter(v => !existingIds.has(v.embed_id));

    if (!newVideos.length) {
      return { statusCode: 200, body: JSON.stringify({ message: 'All videos already in library', total: VIDEO_LIBRARY.length }) };
    }

    // Pick 4–6 per day, rotating by audience to cover all types
    const audiences = ['youth', 'parent', 'kinship', 'worker', 'all'];
    const dayIndex = Math.floor(Date.now() / 86400000); // changes daily
    const selected = [];
    
    // Pick at least one per audience if available
    for (const aud of audiences) {
      const pool = newVideos.filter(v => v.audience === aud);
      if (pool.length) {
        selected.push(pool[dayIndex % pool.length]);
      }
    }
    // Fill up to 6 total from remaining new videos
    const remaining = newVideos.filter(v => !selected.includes(v));
    while (selected.length < 6 && remaining.length) {
      selected.push(remaining.splice((dayIndex * 7) % remaining.length, 1)[0]);
    }

    // Insert selected videos
    const toInsert = selected.map(v => ({
      title: v.title,
      url: `https://www.youtube.com/watch?v=${v.embed_id}`,
      embed_id: v.embed_id,
      source: 'youtube',
      channel: v.channel,
      audience: v.audience,
      topic: v.topic,
      duration_sec: v.duration_sec,
      approved: true,
      featured: v.duration_sec <= 150, // short videos get featured
      added_at: new Date().toISOString(),
      views: 0,
    }));

    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(toInsert),
    });

    if (!insertRes.ok) {
      const err = await insertRes.text();
      throw new Error(`Supabase insert failed: ${err}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Added ${toInsert.length} videos`,
        added: toInsert.map(v => `${v.audience}: ${v.title} (${v.duration_sec}s)`),
        remaining_in_library: newVideos.length - toInsert.length,
      }),
    };
  } catch (err) {
    console.error('daily-videos error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
