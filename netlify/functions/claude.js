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
        else liveTest = `FAILED ${r.status} — ${d.error?.type || ''}: ${d.error?.message || JSON.stringify(d)}`;
      } catch (e) {
        liveTest = `NETWORK ERROR — ${e.message}`;
      }
    }

    const keyOk = apiKey && apiKey.startsWith('sk-ant-');
    const testOk = liveTest.startsWith('WORKING');
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'text/html' },
      body: `<!DOCTYPE html><html><head><title>AuntNancy Claude Function Diagnostic</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;max-width:760px;margin:40px auto;padding:20px;line-height:1.6;color:#1a1a1a}h1{font-size:22px;border-bottom:2px solid #c8923a;padding-bottom:8px}.row{padding:10px 14px;margin:8px 0;border-radius:6px;background:#f7f4ef;border-left:3px solid #c8923a}.label{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#666;margin-bottom:3px}.val{font-family:ui-monospace,monospace;font-size:13px;color:#1a1a1a;word-break:break-all}.ok{border-left-color:#2a6649;background:#eaf3ee}.err{border-left-color:#c0392b;background:#fce9e6}.hint{font-size:12px;color:#666;margin-top:14px;line-height:1.7}</style></head>
<body><h1>AuntNancy.org Claude Function Diagnostic</h1>
<div class="row ok"><div class="label">Function deployed</div><div class="val">YES — you're seeing this page, so the function is live at /.netlify/functions/claude</div></div>
<div class="row ${keyOk?'ok':'err'}"><div class="label">ANTHROPIC_API_KEY env variable</div><div class="val">${keyStatus}</div></div>
<div class="row ${testOk?'ok':'err'}"><div class="label">Anthropic API live test (model: claude-sonnet-4-6)</div><div class="val">${liveTest}</div></div>
<div class="row"><div class="label">Function file deployed at</div><div class="val">${new Date().toISOString()} — node ${process.version}</div></div>
<div class="hint"><b>If everything above is green, the Education page should work.</b> Clear browser cache and reload auntnancy.org/#education.<br><br>If the API live test shows FAILED 401 authentication_error — the API key is wrong or revoked. Generate a new key at console.anthropic.com and update it in Netlify env vars.<br>If it shows FAILED 400 invalid_request_error model — the model name in this file is wrong (must be claude-sonnet-4-6).<br>If it shows FAILED 429 rate_limit — your Anthropic account is out of credit. Add billing at console.anthropic.com.<br>If it shows FAILED 404 not_found_error — same as the model issue, redeploy this file.</div>
</body></html>`,
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed. Use POST, or GET for diagnostics.' }) };
  }

  try {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body: ' + e.message }) };
    }

    if (!body.messages || !Array.isArray(body.messages) || !body.messages.length) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing or empty messages array' }) };
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured in Netlify environment variables' }) };
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: body.model || 'claude-haiku-4-5-20251001',
        max_tokens: body.max_tokens || 1000,
        system: body.system || undefined,
        messages: body.messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic API error', response.status, JSON.stringify(data));
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: data.error?.message || `Anthropic returned ${response.status}`,
          type: data.error?.type,
          status: response.status,
        }),
      };
    }

    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (err) {
    console.error('Function exception:', err.message, err.stack);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Function exception: ' + err.message }) };
  }
};
