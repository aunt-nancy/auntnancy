// netlify/functions/daily-videos.js
// Adds curated videos to Supabase daily
// Visit https://auntnancy.org/.netlify/functions/daily-videos to trigger manually

// Hardcoded fallbacks — these match what the site already uses
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vnfjszmhmcxkxegzvivg.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY
  || process.env.SUPABASE_KEY
  || 'sb_publishable_5s7SB5PmfKyHOSMKG6GCkA_s7Q_PLxG';

const VIDEO_LIBRARY = [
  // FOSTER YOUTH
  {embed_id:'AHNMkLB43Rc', title:'Creating Change for Youth in Foster Care', channel:'FosterClub', audience:'youth', topic:'Advocacy', duration_sec:142},
  {embed_id:'7tFfGgCkHEw', title:'Foster Youth Rights — Know What You\'re Owed', channel:'FosterClub', audience:'youth', topic:'Rights', duration_sec:132},
  {embed_id:'Ks-_Mh1QhMc', title:'Aging Out of Foster Care — What to Know', channel:'FosterClub', audience:'youth', topic:'Aging Out', duration_sec:890},
  {embed_id:'cBnSMCBnMa0', title:'AB 12 — Staying in Care Past 18 in California', channel:'CDSS', audience:'youth', topic:'AB 12', duration_sec:540},
  {embed_id:'1fTMBLXU83w', title:'ETV Grants — Education Money for Foster Youth', channel:'National Foster Youth Institute', audience:'youth', topic:'Education', duration_sec:360},
  {embed_id:'IWNx9LPKPKA', title:'Foster Youth in College — Your Rights & Resources', channel:'FosterClub', audience:'youth', topic:'Education', duration_sec:720},
  {embed_id:'4QBzRuHHOcU', title:'What Foster Care Taught Me — Youth Voices', channel:'Dave Thomas Foundation', audience:'youth', topic:'Stories', duration_sec:148},
  {embed_id:'zN_KJ0HbEd0', title:'Mental Health & Foster Care — It\'s OK to Ask for Help', channel:'NAMI', audience:'youth', topic:'Mental Health', duration_sec:480},
  {embed_id:'M7lc1UVf-VE', title:'Foster Youth and the Juvenile Justice System', channel:'Youth Law Center', audience:'youth', topic:'Legal Rights', duration_sec:1200},
  {embed_id:'w3DkY-7dZQU', title:'Discipline in Foster Care: Managing Our Behaviors to Manage Theirs', channel:'Hennepin County', audience:'youth', topic:'Behavior', duration_sec:1680},

  // FOSTER PARENTS
  {embed_id:'Bey4XXJAqS8', title:'Trauma-Informed Parenting — The Basics Every Foster Parent Needs', channel:'Casey Family Programs', audience:'parent', topic:'Trauma', duration_sec:1440},
  {embed_id:'KJ_VEhU_Qdg', title:'How to Talk to Foster Children About Their Past', channel:'Skookum Kids', audience:'parent', topic:'Communication', duration_sec:780},
  {embed_id:'ggpKQEcRTEI', title:'The First 72 Hours — New Placement Checklist', channel:'Hennepin County', audience:'parent', topic:'Placement', duration_sec:145},
  {embed_id:'D1R-jKKp3NA', title:'Attachment & Foster Care — Building Trust With Kids', channel:'Dave Thomas Foundation', audience:'parent', topic:'Attachment', duration_sec:1320},
  {embed_id:'YVFKHrqhBjA', title:'Understanding Childhood Trauma — ACEs Explained', channel:'CDC', audience:'parent', topic:'ACEs', duration_sec:900},
  {embed_id:'pWp61S4K4Tg', title:'Therapeutic Parenting Strategies', channel:'NCTSN', audience:'parent', topic:'Parenting', duration_sec:1800},
  {embed_id:'9vJRopau0g0', title:'Working With a Child\'s Caseworker — What to Expect', channel:'Skookum Kids', audience:'parent', topic:'DCFS', duration_sec:540},
  {embed_id:'P6FORpg0KVo', title:'Self-Care for Foster Parents — Preventing Burnout', channel:'Casey Family Programs', audience:'parent', topic:'Self-Care', duration_sec:144},
  {embed_id:'aS8n9dMo4pM', title:'Navigating Court — A Foster Parent\'s Guide', channel:'Annie E. Casey Foundation', audience:'parent', topic:'Court', duration_sec:1080},
  {embed_id:'fgr8u4kZ6MQ', title:'Reunification — Preparing Children for Going Home', channel:'NFYI', audience:'parent', topic:'Reunification', duration_sec:960},
  {embed_id:'bXJmKcNfnNs', title:'Foster to Adopt — Understanding the Process', channel:'Dave Thomas Foundation', audience:'parent', topic:'Adoption', duration_sec:1560},

  // KINSHIP
  {embed_id:'3YS7bKem3k0', title:'Kinship Care — Rights & Resources for Relative Caregivers', channel:'Annie E. Casey Foundation', audience:'kinship', topic:'Rights', duration_sec:840},
  {embed_id:'RjzKuBd9z5k', title:'Guardianship vs. Foster Care — What\'s the Difference?', channel:'CDSS', audience:'kinship', topic:'Guardianship', duration_sec:600},
  {embed_id:'vGJTaP6anOU', title:'Financial Help for Kinship Families', channel:'Casey Family Programs', audience:'kinship', topic:'Benefits', duration_sec:480},
  {embed_id:'MHhkTOT2rqU', title:'Kinship Licensing — Becoming a Certified Relative Caregiver', channel:'Hennepin County', audience:'kinship', topic:'Licensing', duration_sec:143},
  {embed_id:'c0BCkHxIFoI', title:'Supporting Children\'s Connection to Their Birth Parents as Kin', channel:'Skookum Kids', audience:'kinship', topic:'Family Connection', duration_sec:720},
  {embed_id:'bCKi_KCjyG4', title:'Kinship Navigator Programs — Getting the Support You Deserve', channel:'Annie E. Casey Foundation', audience:'kinship', topic:'Navigation', duration_sec:900},
  {embed_id:'A9f94kk4Y_E', title:'Grief & Loss in Kinship Placements', channel:'NCTSN', audience:'kinship', topic:'Grief', duration_sec:1080},
  {embed_id:'ZIQQkKfKe_s', title:'Relative Caregiver Benefits in California', channel:'CDSS', audience:'kinship', topic:'Benefits', duration_sec:540},

  // SOCIAL WORKERS
  {embed_id:'c4LMGfBoMoY', title:'Trauma-Informed Practice for Child Welfare Workers', channel:'NCTSN', audience:'worker', topic:'Trauma', duration_sec:1800},
  {embed_id:'JY-4EG5ZfAw', title:'Motivational Interviewing in Child Welfare', channel:'Casey Family Programs', audience:'worker', topic:'Practice', duration_sec:1440},
  {embed_id:'R_Sl_VqnNcw', title:'Secondary Traumatic Stress — Social Worker Self-Care', channel:'CWTTK', audience:'worker', topic:'Self-Care', duration_sec:148},
  {embed_id:'yHpIRKVbdkE', title:'Conducting Home Studies — Best Practices', channel:'Hennepin County', audience:'worker', topic:'Assessment', duration_sec:1320},
  {embed_id:'tLyaHxGqRz8', title:'Working With Kinship Families — A Strengths-Based Approach', channel:'Annie E. Casey Foundation', audience:'worker', topic:'Kinship', duration_sec:960},
  {embed_id:'N9Xq-jBpSwg', title:'Court Reports — Writing Effective Recommendations', channel:'Casey Family Programs', audience:'worker', topic:'Court', duration_sec:1200},
  {embed_id:'pZw9L27OILY', title:'Cultural Humility in Child Welfare Practice', channel:'Child Welfare Information Gateway', audience:'worker', topic:'Culture', duration_sec:144},

  // ALL AUDIENCES
  {embed_id:'1S_6K0JHTCY', title:'The Foster Care System Explained', channel:'FosterClub', audience:'all', topic:'Overview', duration_sec:135},
  {embed_id:'FZ8f6zAccXw', title:'Adverse Childhood Experiences (ACEs) — Overview', channel:'CDC', audience:'all', topic:'ACEs', duration_sec:840},
  {embed_id:'95-3S_pDmLY', title:'The Science of Neglect — Child Brain Development', channel:'Center on the Developing Child', audience:'all', topic:'Child Development', duration_sec:146},
  {embed_id:'bFOASKyqBtA', title:'How Trauma Changes the Brain — For Caregivers', channel:'NCTSN', audience:'all', topic:'Trauma', duration_sec:900},
  {embed_id:'G-GbpHY2kA4', title:'LGBTQ+ Youth in Foster Care — Creating Affirming Homes', channel:'FosterClub', audience:'all', topic:'LGBTQ+', duration_sec:1080},
  {embed_id:'sVPdRzWLGLk', title:'Sibling Connections in Foster Care — Why It Matters', channel:'Dave Thomas Foundation', audience:'all', topic:'Siblings', duration_sec:148},
  {embed_id:'Z6YBbW8Kgsc', title:'Foster Care & Education — Every Child Deserves Stability', channel:'Annie E. Casey Foundation', audience:'all', topic:'Education', duration_sec:720},
  {embed_id:'nRAF_EkAMSU', title:'Talking With Children About Foster Care', channel:'Skookum Kids', audience:'all', topic:'Communication', duration_sec:480},
];

async function supabaseRequest(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1${path}`;
  const headers = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    ...options.headers,
  };
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  const log = [];
  const ts = new Date().toISOString();
  log.push(`[${ts}] daily-videos triggered`);
  log.push(`Supabase URL: ${SUPABASE_URL}`);
  log.push(`Key present: ${!!SUPABASE_KEY} (${SUPABASE_KEY?.slice(0,20)}...)`);

  try {
    // 1. Fetch existing embed_ids
    const existing = await supabaseRequest('/videos?select=embed_id&limit=1000');
    if (!existing.ok) {
      log.push(`ERROR fetching existing videos: ${existing.status} — ${JSON.stringify(existing.data)}`);
      // Don't stop — continue and try to insert (Prefer:resolution=ignore-duplicates handles it)
    }
    const existingIds = new Set(
      Array.isArray(existing.data) ? existing.data.map(v => v.embed_id) : []
    );
    log.push(`Existing videos in DB: ${existingIds.size}`);

    // 2. Filter to unseen videos
    const newVideos = VIDEO_LIBRARY.filter(v => !existingIds.has(v.embed_id));
    log.push(`New videos available: ${newVideos.length}`);

    if (!newVideos.length) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'All videos already in library', log }),
      };
    }

    // 3. Pick up to 8 per run, one per audience type minimum
    const audiences = ['youth', 'parent', 'kinship', 'worker', 'all'];
    const selected = [];
    const used = new Set();

    // One per audience
    for (const aud of audiences) {
      const pool = newVideos.filter(v => v.audience === aud && !used.has(v.embed_id));
      if (pool.length) {
        const pick = pool[Math.floor(Date.now() / 86400000) % pool.length];
        selected.push(pick);
        used.add(pick.embed_id);
      }
    }
    // Fill to 8
    for (const v of newVideos) {
      if (selected.length >= 8) break;
      if (!used.has(v.embed_id)) { selected.push(v); used.add(v.embed_id); }
    }

    log.push(`Selected ${selected.length} videos to insert`);

    // 4. Insert
    const rows = selected.map(v => ({
      title: v.title,
      url: `https://www.youtube.com/watch?v=${v.embed_id}`,
      embed_id: v.embed_id,
      source: 'youtube',
      channel: v.channel,
      audience: v.audience,
      topic: v.topic,
      duration_sec: v.duration_sec,
      approved: true,
      featured: v.duration_sec <= 150,
      added_at: new Date().toISOString(),
      views: 0,
    }));

    const insert = await supabaseRequest('/videos', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify(rows),
    });

    log.push(`Insert status: ${insert.status}`);
    if (!insert.ok) log.push(`Insert error: ${JSON.stringify(insert.data)}`);

    return {
      statusCode: insert.ok ? 200 : 500,
      headers,
      body: JSON.stringify({
        message: insert.ok ? `✅ Added ${selected.length} videos` : '❌ Insert failed',
        added: selected.map(v => `${v.audience}: ${v.title}`),
        remaining: newVideos.length - selected.length,
        log,
      }),
    };
  } catch (err) {
    log.push(`EXCEPTION: ${err.message}`);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message, log }),
    };
  }
};
