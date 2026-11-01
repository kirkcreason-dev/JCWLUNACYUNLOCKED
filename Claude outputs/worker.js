/* JCW Lunacy — points purchase redeemer (Cloudflare Worker "jcw-points")
 *
 * The site sends a buyer to the Stripe Payment Link for "10,000 JCW Lunacy
 * Points" with ?client_reference_id=<their Firebase uid>. Stripe sends them
 * back to https://jcwlunacy.net/?pts_session=<checkout session id>#locker and
 * the site POSTs { sessionId, idToken } here.
 *
 * This worker only says yes when ALL of these hold:
 *   - the Firebase ID token is genuine (Google's signing keys) and not expired
 *   - the Checkout Session is complete AND paid
 *   - the session was bought for THIS account (client_reference_id == uid)
 *   - it contains the points price
 *   - it hasn't been redeemed before (recorded in the REDEEMED KV namespace)
 * and answers { ok:true, points }. The site then adds the points.
 *
 * LUNATICS MEMBERSHIP SYNC (added 2026-10-19)
 * Lunatics access (premiumMembers/<uid> in the Realtime Database) now follows
 * Stripe billing by itself:
 *   - every 30 minutes (Cron Trigger) the worker lists every Stripe
 *     subscription, maps it to the member through the Checkout Session's
 *     client_reference_id (the site always sends the uid), and
 *       * active / trialing / past_due  -> premiumMembers/<uid> = true
 *       * canceled / unpaid / ended     -> premiumMembers/<uid> removed
 *   - POST /lunatic {idToken} runs the same check for one member right away
 *     (the site calls it when a signed-in member isn't a Lunatic yet, so a
 *     brand-new payment unlocks within seconds instead of 30 minutes).
 *   - mods, the house accounts and Jeff Lane are never removed (free access).
 *
 * Needs (set in the Cloudflare dashboard, never in this file):
 *   STRIPE_KEY  secret  — a Stripe RESTRICTED key with "Checkout Sessions: Read"
 *                         and (for the Lunatics sync) "Subscriptions: Read"
 *   FB_SECRET   secret  — Firebase Realtime Database secret (Project settings →
 *                         Service accounts → Database secrets) — lets the worker
 *                         write premiumMembers; only needed for the Lunatics sync
 *   REDEEMED    KV namespace binding (also stores the sub→member map)
 */
const PROJECT = 'jcw-lunacy';
const POINTS_PRICE = 'price_1UO2IYRqanebYjWndWKpSXUp';   // $10.00 → 10,000 points
const POINTS_PER_UNIT = 10000;
const ORIGINS = ['https://jcwlunacy.net', 'https://www.jcwlunacy.net'];
const DB = 'https://jcw-lunacy-default-rtdb.firebaseio.com';
/* free / staff access — the sync never takes these away */
const KEEP = new Set([
  'oYrNiXZywhexmLqRQO7j1iyA1Bh1', // Digital Duke
  'zRLXcejE4dWQRL0l07Bo19SO5j52', // Creaso Norse Tech
  'GZ4FzgT740gxOtiFUtBaxshngbi2', // Jeff Lane
  'L1feNpUUBPfe9ONSwxpgwqcVFPv1', 'PlWKdSiM9hfJ5HJ2WNBN9IqwPBN2', 'QC0UIOmTazZNOrIiwPznSa7YEo53',
  'widUOpWNhYhTtAVf3iDseNHHWVE3', 'TwkyqKXbJ6NV8VNewfofluB1sji2', 'CUqiZLujVGTTbvXsgEynoOaUzA52',
  'krXCIRnqkUcfPgXMsM9E5PcoTxi1', '4IQHHQJXUUUi1gx6fRSg94J9ug82', 'LmjvpMlKlVNpyoXajb74P5guaqu2'
]);
const LIVE = new Set(['active', 'trialing', 'past_due']);
const JWKS = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

export default {
  async scheduled(event, env, ctx) {
    if (env.STRIPE_KEY && env.FB_SECRET && env.REDEEMED) ctx.waitUntil(syncAll(env).catch(() => {}));
  },
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin'
    };
    const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const url = new URL(req.url);
    if (url.pathname === '/') return json({ ok: true, service: 'jcw-points', ready: !!(env.STRIPE_KEY && env.REDEEMED), lunatics: !!(env.STRIPE_KEY && env.FB_SECRET && env.REDEEMED) });
    if (url.pathname === '/lunatic' && req.method === 'POST') {
      if (!env.STRIPE_KEY || !env.FB_SECRET || !env.REDEEMED) return json({ error: 'membership sync is not switched on yet' }, 503);
      let b; try { b = await req.json(); } catch (e) { return json({ error: 'bad request' }, 400); }
      let u; try { u = await verifyIdToken(String((b && b.idToken) || '')); } catch (e) { return json({ error: 'please log into your Locker first' }, 401); }
      try { const r = await syncOne(env, u); return json({ ok: true, lunatic: r.lunatic, status: r.status || null }); }
      catch (e) { return json({ error: 'could not check your membership right now' }, 502); }
    }
    if (url.pathname !== '/redeem' || req.method !== 'POST') return json({ error: 'not found' }, 404);
    if (!env.STRIPE_KEY || !env.REDEEMED) return json({ error: 'points checkout is not switched on yet' }, 503);

    let body;
    try { body = await req.json(); } catch (e) { return json({ error: 'bad request' }, 400); }
    const sid = String((body && body.sessionId) || '');
    if (!/^cs_(live|test)_[A-Za-z0-9]{10,200}$/.test(sid)) return json({ error: 'bad session id' }, 400);

    let uid;
    try { uid = await verifyIdToken(String((body && body.idToken) || '')); }
    catch (e) { return json({ error: 'please log into your Locker first' }, 401); }

    const s = await stripeGet(env, '/v1/checkout/sessions/' + encodeURIComponent(sid) + '?expand[]=line_items');
    if (!s || s.error || s.object !== 'checkout.session') return json({ error: 'purchase not found' }, 404);
    if (s.status !== 'complete' || s.payment_status !== 'paid') return json({ error: 'payment not finished yet', pending: true }, 409);
    if (s.client_reference_id !== uid) return json({ error: 'this purchase belongs to a different account' }, 403);

    let units = 0;
    for (const li of ((s.line_items && s.line_items.data) || [])) {
      if (li && li.price && li.price.id === POINTS_PRICE) units += (li.quantity || 0);
    }
    if (!units) return json({ error: 'not a points purchase' }, 400);
    const points = units * POINTS_PER_UNIT;

    const key = 'cs:' + sid;
    const prior = await env.REDEEMED.get(key);
    if (prior) return json({ ok: false, already: true, points });
    await env.REDEEMED.put(key, JSON.stringify({ uid, points, at: new Date().toISOString(), amount: s.amount_total, currency: s.currency }));
    return json({ ok: true, points });
  }
};

async function stripeGet(env, path) {
  try {
    const r = await fetch('https://api.stripe.com' + path, { headers: { Authorization: 'Bearer ' + env.STRIPE_KEY } });
    return await r.json();
  } catch (e) { return null; }
}

function b64urlBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  s += '='.repeat((4 - s.length % 4) % 4);
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

/* Firebase ID token check (RS256, Google's securetoken keys) — returns the uid */
async function verifyIdToken(tok) {
  const parts = tok.split('.');
  if (parts.length !== 3) throw new Error('shape');
  const [h, p, sg] = parts;
  const header = JSON.parse(new TextDecoder().decode(b64urlBytes(h)));
  const payload = JSON.parse(new TextDecoder().decode(b64urlBytes(p)));
  if (header.alg !== 'RS256' || !header.kid) throw new Error('alg');
  const r = await fetch(JWKS, { cf: { cacheTtl: 3600, cacheEverything: true } });
  const { keys } = await r.json();
  const jwk = (keys || []).find(k => k.kid === header.kid);
  if (!jwk) throw new Error('kid');
  const key = await crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlBytes(sg), new TextEncoder().encode(h + '.' + p));
  if (!ok) throw new Error('sig');
  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== PROJECT) throw new Error('aud');
  if (payload.iss !== 'https://securetoken.google.com/' + PROJECT) throw new Error('iss');
  if (!(payload.exp > now) || payload.iat > now + 300) throw new Error('time');
  if (!payload.sub || typeof payload.sub !== 'string') throw new Error('sub');
  return payload.sub;
}

/* ===================== LUNATICS MEMBERSHIP SYNC ===================== */
async function uidForSub(env, sub) {
  const k = 'subuid:' + sub.id;
  const c = await env.REDEEMED.get(k);
  if (c) return c === '-' ? null : c;
  const r = await stripeGet(env, '/v1/checkout/sessions?limit=1&subscription=' + encodeURIComponent(sub.id));
  const s = r && r.data && r.data[0];
  const uid = (s && s.client_reference_id && /^[A-Za-z0-9_-]{10,128}$/.test(s.client_reference_id)) ? s.client_reference_id : null;
  if (r && Array.isArray(r.data)) await env.REDEEMED.put(k, uid || '-');   // cache only real answers
  return uid;
}

async function allSubs(env) {
  const out = []; let after = null;
  for (let page = 0; page < 50; page++) {
    const r = await stripeGet(env, '/v1/subscriptions?status=all&limit=100' + (after ? '&starting_after=' + after : ''));
    if (!r || !Array.isArray(r.data)) throw new Error((r && r.error && r.error.message) || 'stripe list failed');
    out.push(...r.data);
    if (!r.has_more || !r.data.length) break;
    after = r.data[r.data.length - 1].id;
  }
  return out;
}

async function dbGet(env, path) {
  const r = await fetch(DB + path + '.json?auth=' + encodeURIComponent(env.FB_SECRET));
  if (!r.ok) throw new Error('db read ' + r.status);
  return r.json();
}
async function dbPut(env, path, val) {
  const r = await fetch(DB + path + '.json?auth=' + encodeURIComponent(env.FB_SECRET), { method: val === null ? 'DELETE' : 'PUT', body: val === null ? undefined : JSON.stringify(val) });
  if (!r.ok) throw new Error('db write ' + r.status);
}

/* one member's verdict: best status across all their subscriptions */
async function apply(env, uid, status) {
  const live = LIVE.has(status);
  const cur = (await dbGet(env, '/premiumMembers/' + uid)) === true;
  if (live) {
    if (!cur) await dbPut(env, '/premiumMembers/' + uid, true);
    return { lunatic: true, status };
  }
  if (cur && !KEEP.has(uid)) await dbPut(env, '/premiumMembers/' + uid, null);
  return { lunatic: KEEP.has(uid) && cur, status };
}

const RANK = { active: 4, trialing: 3, past_due: 2 };
function better(a, b) { return (RANK[a] || 0) >= (RANK[b] || 0) ? a : b; }

async function syncAll(env) {
  const subs = await allSubs(env);
  const best = {};
  for (const s of subs) {
    const uid = await uidForSub(env, s);
    if (!uid) continue;
    best[uid] = best[uid] ? better(best[uid], s.status) : s.status;
  }
  for (const uid of Object.keys(best)) { try { await apply(env, uid, best[uid]); } catch (e) {} }
  await env.REDEEMED.put('lun:lastSync', JSON.stringify({ at: new Date().toISOString(), subs: subs.length, members: Object.keys(best).length }));
}

async function syncOne(env, uid) {
  /* look through the member's checkout sessions for their subscriptions */
  const subs = await allSubs(env);
  let status = null;
  for (const s of subs) { if ((await uidForSub(env, s)) === uid) status = status ? better(status, s.status) : s.status; }
  if (!status) return { lunatic: (await dbGet(env, '/premiumMembers/' + uid)) === true, status: null };
  return apply(env, uid, status);
}
