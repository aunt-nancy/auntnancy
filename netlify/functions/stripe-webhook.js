// netlify/functions/stripe-webhook.js
// Called by Stripe when a payment completes.
// Saves the subscription to Supabase so the user gets access.
// In Stripe: Developers → Webhooks → Add endpoint → https://auntnancy.org/.netlify/functions/stripe-webhook
// Events: checkout.session.completed

const SUPABASE_URL = 'https://vnfjszmhmcxkxegzvivg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_5s7SB5PmfKyHOSMKG6GCkA_s7Q_PLxG';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'POST only' };

  try {
    let stripeEvent;
    try {
      stripeEvent = JSON.parse(event.body);
    } catch (e) {
      return { statusCode: 400, body: 'Invalid JSON' };
    }

    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data?.object;
      const tier  = session?.metadata?.tier;
      const email = session?.metadata?.email || session?.customer_email;
      const amount = (session?.amount_total || 0) / 100;

      if (!tier || !email) {
        console.error('Missing tier or email in session metadata', session);
        return { statusCode: 200, body: JSON.stringify({ received: true, warning: 'missing metadata' }) };
      }

      // Upsert subscription in Supabase
      const r = await fetch(`${SUPABASE_URL}/rest/v1/user_subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({
          user_email: email,
          tier,
          amount_paid: amount,
          stripe_session_id: session.id,
          stripe_customer_id: session.customer || null,
          active: true,
        }),
      });

      if (!r.ok) {
        const err = await r.text();
        console.error('Supabase upsert error:', err);
        return { statusCode: 500, body: JSON.stringify({ error: 'Supabase write failed: ' + err }) };
      }

      console.log(`Subscription activated: ${email} → ${tier} ($${amount})`);
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    console.error('stripe-webhook error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
