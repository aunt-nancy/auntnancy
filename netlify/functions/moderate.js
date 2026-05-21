// netlify/functions/moderate.js
// Takes a community-submitted blog post body and returns { safe: true/false, reason: '...' }
// Frontend uses this BEFORE inserting into Supabase so unsafe posts never go live.

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'POST only' }) };

  try {
    const body = JSON.parse(event.body || '{}');
    const content = (body.title || '') + '\n\n' + (body.body_md || '');
    if (!content.trim()) return { statusCode: 400, headers, body: JSON.stringify({ error: 'No content' }) };

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'API key not configured' }) };

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: 'You are a content moderator for a foster care support website. You must determine if user-submitted content is safe to publish. Reply with ONLY a JSON object — no markdown, no preamble. Format: {"safe": true|false, "reason": "short explanation"}',
        messages: [{
          role: 'user',
          content: `Determine if this community blog post is safe to auto-publish on a foster care support site read by foster parents, kinship caregivers, foster youth (ages 12-21), and social workers.

UNSAFE if it contains any of:
- Threats of violence or graphic violence descriptions
- Hate speech, slurs, or content targeting identities
- Sexual content or material inappropriate for minors
- Harassment or targeting of identifiable people
- Doxxing (revealing private info about identifiable people — names plus addresses/phone/etc.)
- Promoting illegal activity (beyond discussing it factually)
- Spam, advertising, or scams
- Misinformation that could harm foster youth (medical, legal)

SAFE if:
- It shares personal foster care experiences (even painful or angry ones)
- It criticizes DCFS, courts, schools, or policies (criticism is protected)
- It discusses trauma, mental health, or family dynamics in good faith
- It contains strong language or frustration but no threats
- It names public officials/agencies (which is fine) but not private individuals

Content to evaluate:

---
${content.substring(0, 4000)}
---

Respond with ONLY: {"safe": true|false, "reason": "..."}`
        }],
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      // If moderation API fails, err on the safe side: mark pending for human review
      return { statusCode: 200, headers, body: JSON.stringify({ safe: false, reason: 'Auto-moderation unavailable — held for review', pending: true }) };
    }

    let text = data.content?.[0]?.text || '';
    text = text.replace(/```json|```/g, '').trim();
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first === -1 || last === -1) {
      return { statusCode: 200, headers, body: JSON.stringify({ safe: false, reason: 'Could not verify safety — held for review', pending: true }) };
    }

    try {
      const result = JSON.parse(text.substring(first, last + 1));
      return { statusCode: 200, headers, body: JSON.stringify({ safe: !!result.safe, reason: result.reason || '' }) };
    } catch (e) {
      return { statusCode: 200, headers, body: JSON.stringify({ safe: false, reason: 'Could not verify safety — held for review', pending: true }) };
    }
  } catch (err) {
    console.error('moderate error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
