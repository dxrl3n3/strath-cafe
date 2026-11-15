// Written only from PharmaLink's contract (openapi.yaml v1.1.0), not from their code.
const request = require('supertest');

const BASE = process.env.PARTNER_URL || 'http://localhost:5000';
const KEY = process.env.PARTNER_API_KEY || '';
const api = () => {
  const r = request(BASE);
  const wrap = {};
  for (const m of ['get', 'post', 'put', 'delete']) wrap[m] = (url) => r[m](url).set('X-API-Key', KEY);
  return wrap;
};

const MEDICINE_FIELDS = ['id', 'name', 'category', 'stockLevel', 'unitPrice', 'status', 'pharmacyId', 'pharmacyName', 'area', 'updatedAt'];

function expectMedicine(m) {
  for (const f of MEDICINE_FIELDS) expect(m).toHaveProperty(f);
  expect(Number.isInteger(m.id)).toBe(true);
  expect(typeof m.name).toBe('string');
  expect(Number.isInteger(m.stockLevel)).toBe(true);
  expect(m.stockLevel).toBeGreaterThanOrEqual(0);
  expect(typeof m.unitPrice).toBe('number');
  expect(['in_stock', 'low_stock', 'out_of_stock']).toContain(m.status);
  expect(Number.isNaN(Date.parse(m.updatedAt))).toBe(false);
}

describe('PharmaLink GET /medicines', () => {
  it('returns 200 and a list of medicines', async () => {
    const res = await api().get('/medicines');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    res.body.forEach(expectMedicine);
  });

  it('q filters by medicine name', async () => {
    const res = await api().get('/medicines?q=paracetamol');
    expect(res.status).toBe(200);
    expect(res.body.every((m) => m.name.toLowerCase().includes('paracetamol'))).toBe(true);
  });

  it('status agrees with stockLevel as the contract describes', async () => {
    const res = await api().get('/medicines');
    for (const m of res.body) {
      const expected = m.stockLevel === 0 ? 'out_of_stock' : m.stockLevel < 10 ? 'low_stock' : 'in_stock';
      expect(m.status).toBe(expected);
    }
  });

  it('inStock=true only returns stock above 0', async () => {
    const res = await api().get('/medicines?inStock=true');
    expect(res.status).toBe(200);
    expect(res.body.every((m) => m.stockLevel > 0)).toBe(true);
  });

  it('returns an empty list when nothing matches', async () => {
    const res = await api().get('/medicines?q=zzz-no-such-medicine');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 400 with a message for an invalid inStock value', async () => {
    const res = await api().get('/medicines?inStock=maybe');
    expect(res.status).toBe(400);
    expect(typeof res.body.message).toBe('string');
  });
});

describe('PharmaLink GET /medicines/{id}', () => {
  it('returns the same record the list returned', async () => {
    const list = await api().get('/medicines');
    const first = list.body[0];
    const res = await api().get('/medicines/' + first.id);
    expect(res.status).toBe(200);
    expectMedicine(res.body);
    expect(res.body.name).toBe(first.name);
  });

  it('returns 404 with a message for an id that does not exist', async () => {
    const res = await api().get('/medicines/987654');
    expect(res.status).toBe(404);
    expect(typeof res.body.message).toBe('string');
  });

  it('returns 400 for an id that is not an integer', async () => {
    const res = await api().get('/medicines/paracetamol');
    expect(res.status).toBe(400);
  });
});

describe('PharmaLink POST, PUT, DELETE /medicines', () => {
  it('rejects a body with a missing field with 400', async () => {
    const res = await api().post('/medicines').send({ name: 'Test only' });
    expect(res.status).toBe(400);
    expect(typeof res.body.message).toBe('string');
  });

  it('rejects stockLevel sent as a string with 400', async () => {
    const res = await api().post('/medicines').send({ name: 'Test only', category: 'Test', stockLevel: '5', unitPrice: 10, pharmacyId: 1 });
    expect(res.status).toBe(400);
  });

  it('creates (201 + Location), updates (200), then deletes (204) a record', async () => {
    const pharmacies = await api().get('/pharmacies');
    const pharmacyId = pharmacies.body[0].id;
    const name = 'Cafe partner test ' + Date.now();

    const created = await api().post('/medicines').send({ name, category: 'Test', stockLevel: 4, unitPrice: 10, pharmacyId });
    expect(created.status).toBe(201);
    expectMedicine(created.body);
    expect(created.headers.location).toBe('/medicines/' + created.body.id);
    expect(created.body.status).toBe('low_stock');

    const updated = await api().put('/medicines/' + created.body.id).send({ name, category: 'Test', stockLevel: 0, unitPrice: 12 });
    expect(updated.status).toBe(200);
    expect(updated.body.stockLevel).toBe(0);
    expect(updated.body.status).toBe('out_of_stock');

    const deleted = await api().delete('/medicines/' + created.body.id);
    expect(deleted.status).toBe(204);
    expect((await api().get('/medicines/' + created.body.id)).status).toBe(404);
  });

  it('PUT on an id that does not exist returns 404', async () => {
    const res = await api().put('/medicines/987654').send({ name: 'X', category: 'Y', stockLevel: 1, unitPrice: 1 });
    expect(res.status).toBe(404);
  });

  it('DELETE on an id that does not exist returns 404', async () => {
    const res = await api().delete('/medicines/987654');
    expect(res.status).toBe(404);
  });
});

describe('PharmaLink /pharmacies', () => {
  it('GET /pharmacies returns pharmacies with coordinates', async () => {
    const res = await api().get('/pharmacies');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const p of res.body) {
      expect(Number.isInteger(p.id)).toBe(true);
      expect(typeof p.name).toBe('string');
      expect(typeof p.latitude).toBe('number');
      expect(typeof p.longitude).toBe('number');
      expect(typeof p.verified).toBe('boolean');
      expect(p).not.toHaveProperty('password_hash');
    }
  });

  it('GET /pharmacies/{id} returns 404 for an unknown id', async () => {
    const res = await api().get('/pharmacies/987654');
    expect(res.status).toBe(404);
    expect(typeof res.body.message).toBe('string');
  });
});
