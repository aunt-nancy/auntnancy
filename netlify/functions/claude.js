// AuntNancy.org — Claude API proxy with diagnostic GET endpoint
// Visit /.netlify/functions/claude in a browser to see deployment status
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Diagnostic GET — visit this URL in a browser to verify deployment
  if (event.httpMethod === 'GET') {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const keyStatus = !apiKey
      ? 'MISSING — Set ANTHROPIC_API_KEY in Netlify env vars'
      : !apiKey.startsWith('sk-ant-')
      ? 'INVALID FORMAT — should start with sk-ant-'
      : `OK — present, starts with sk-ant-, ${apiKey.length} chars, ends ${apiKey.slice(-4)}`;

    // Try a tiny test call to Anthropic to verify the key actually works
    let liveTest = 'skipped (no key)';
    if (apiKey && apiKey.startsWith('sk-ant-')) {
      try {
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Say "ok"' }],
          }),
        });
        const d = await r.json();
        if (r.ok) liveTest = `WORKING — Anthropic responded ${r.status} with: ${d.content?.[0]?.text || 'no text'}`;
        else liveTest = `FAILED ${r.status} — ${d.error?.type || ''}:
