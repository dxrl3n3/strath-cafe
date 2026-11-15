// Calls PharmaLink's live API from our server, so their key never reaches the browser.
// PHARMALINK_URL and PHARMALINK_API_KEY come from .env (see .env.example).
const { fetchWithRetry } = require('./resilientFetch');

// Timeout 1500 ms, 2 retries, 200/400 ms waits: worst case 3 x 1500 + 200 + 400 = 5100 ms.
const RESILIENCE = { timeoutMs: 1500, retries: 2, delayMs: 200 };

const PARTNER_URL = () => (process.env.PHARMALINK_URL || '').replace(/\/+$/, '');
const PARTNER_KEY = () => process.env.PHARMALINK_API_KEY || '';

// Returns { ok, status, data } and never throws. Logs the reason for a failure, never the key.
async function call(pathWithQuery) {
  if (!PARTNER_URL()) return { ok: false, status: 0, data: null, reason: 'PHARMALINK_URL is not set' };
  try {
    const res = await fetchWithRetry(
      PARTNER_URL() + pathWithQuery,
      { headers: { 'X-API-Key': PARTNER_KEY(), Accept: 'application/json' } },
      RESILIENCE
    );
    const data = await res.json().catch(() => null);
    if (!res.ok) console.error('pharmalink returned', res.status, 'for', pathWithQuery.split('?')[0]);
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    const reason = err.name === 'TimeoutError' ? 'timeout' : err.cause?.code || err.message;
    console.error('pharmalink call failed:', reason);
    return { ok: false, status: 0, data: null, reason };
  }
}

// Field names exactly as in PharmaLink's openapi.yaml (v1.2.0). We pass on only what our pages use.
const toMedicine = (m) => ({
  id: m.id,
  name: m.name,
  category: m.category,
  pharmacyId: m.pharmacyId,
  pharmacyName: m.pharmacyName,
  area: m.area,
  price: m.unitPrice,
  quantity: m.stockLevel,
  status: m.status
});

const toPharmacy = (p) => ({
  id: p.id,
  name: p.name,
  address: p.area,
  phone: '',
  latitude: typeof p.latitude === 'number' ? p.latitude : null,
  longitude: typeof p.longitude === 'number' ? p.longitude : null,
  verified: Boolean(p.verified)
});

module.exports = { call, toMedicine, toPharmacy };
