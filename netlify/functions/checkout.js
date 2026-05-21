// netlify/functions/checkout.js
// Creates a Stripe Checkout session for Basic ($100) or Premium ($175)
// Requires these Netlify env vars:
//   STRIPE_SECRET_KEY     — from stripe.com → Developers → API Keys
//   STRIPE_BASIC_PRICE_ID  — from Stripe product dashboard (price_...)
//   STRIPE_PREMIUM_PRICE_ID — from Stripe product dashboard (price_...)

const SUPABASE_URL = 'https://vnfjszmhmcxkxegzvivg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_5s7SB5PmfKyHOSMKG6GCkA_s7Q_PLxG';

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
    const { tier, email, name } = JSON.parse(event.body || '{}');
    if (!tier || !email) return { statusCode: 400, headers, body: JSON.stringify({ error: 'tier and email required' }) };

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Stripe not configured. Add STRIPE_SECRET_KEY to Netlify env vars.' }) };

    const priceId = tier === 'premium'
      ? process.env.STRIPE_PREMIUM_PRICE_ID
      : process.env.STRIPE_BASIC_PRICE_ID;

    if (!priceId) return { statusCode: 500, headers, body: JSON.stringify({ error: `STRIPE_${tier.toUpperCase()}_PRICE_ID not configured in Netlify env vars.` }) };

    // Create Stripe Checkout Session via REST API (no SDK needed)
    const params = new URLSearchParams({
      'payment_method_types[]': 'card',
      'mode': 'payment',
      'customer_email': email,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'success_url': `https://auntnancy.org/#training?payment=success&tier=${tier}&email=${encodeURIComponent(email)}`,
      'cancel_url': `https://auntnancy.org/#training?payment=cancelled`,
      'metadata[tier]': tier,
      'metadata[email]': email,
      'metadata[name]': name || '',
    });

    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
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
