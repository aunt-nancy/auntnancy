// netlify/functions/checkout.js
// Handles Basic and Premium subscriptions, monthly or annual billing
// Netlify env vars needed:
//   STRIPE_SECRET_KEY
//   STRIPE_BASIC_MONTHLY_PRICE_ID      — $75/month recurring
//   STRIPE_BASIC_ANNUAL_PRICE_ID       — $720/year recurring
//   STRIPE_PREMIUM_MONTHLY_PRICE_ID    — $150/month recurring
//   STRIPE_PREMIUM_ANNUAL_PRICE_ID     — $1500/year recurring

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
    const { tier, billing, email, name } = JSON.parse(event.body || '{}');
    if (!tier || !email) return { statusCode: 400, headers, body: JSON.stringify({ error: 'tier and email required' }) };

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Stripe not configured — add STRIPE_SECRET_KEY to Netlify env vars' }) };

    // Pick the right price ID based on tier + billing period
    const priceMap = {
      basic:   { monthly: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID,   annual: process.env.STRIPE_BASIC_ANNUAL_PRICE_ID },
      premium: { monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID, annual: process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID },
    };
    const billingPeriod = billing === 'annual' ? 'annual' : 'monthly';
    const priceId = priceMap[tier]?.[billingPeriod];
    if (!priceId) return { statusCode: 500, headers, body: JSON.stringify({ error: `STRIPE_${tier.toUpperCase()}_${billingPeriod.toUpperCase()}_PRICE_ID not set in Netlify env vars` }) };

    const params = new URLSearchParams({
      'payment_method_types[]': 'card',
      'mode': 'subscription',
      'customer_email': email,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'success_url': `https://auntnancy.org/#training?payment=success&tier=${tier}&billing=${billingPeriod}&email=${encodeURIComponent(email)}`,
      'cancel_url': 'https://auntnancy.org/#training?payment=cancelled',
      'metadata[tier]': tier,
      'metadata[billing]': billingPeriod,
      'metadata[email]': email,
      'metadata[name]': name || '',
    });

    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const session = await r.json();
    if (!r.ok) throw new Error(session.error?.message || `Stripe ${r.status}`);

    return { statusCode: 200, headers, body: JSON.stringify({ url: session.url, session_id: session.id }) };
  } catch (err) {
    console.error('checkout error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
