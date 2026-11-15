const request = require('supertest');
const { makeTestApp, TEST_KEY } = require('../test-support/withKey');

describe('API key authentication', () => {
  const app = makeTestApp();

  it('returns 401 with no key', async () => {
    const res = await request(app).get('/cafeteria/menu');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'Missing or invalid API key' });
  });

  it('returns 401 with a wrong key', async () => {
    const res = await request(app).get('/cafeteria/orders/ord-5001').set('X-API-Key', 'wrong');
    expect(res.status).toBe(401);
  });

  it('returns 401 for a write with no key, and stores nothing', async () => {
    const res = await request(app).post('/cafeteria/orders').send({ studentId: 'std-7', items: [{ itemId: 'food-1', itemType: 'food', quantity: 1 }] });
    expect(res.status).toBe(401);
    const history = await request(app).get('/cafeteria/students/std-7/orders').set('X-API-Key', TEST_KEY);
    expect(history.body).toEqual([]);
  });

  it('returns 200 with a valid key', async () => {
    const res = await request(app).get('/cafeteria/menu').set('X-API-Key', TEST_KEY);
    expect(res.status).toBe(200);
    expect(res.body[0]).toHaveProperty('itemId');
  });

  it('leaves /health and /docs open', async () => {
    expect((await request(app).get('/health')).status).toBe(200);
    expect((await request(app).get('/docs')).status).toBe(200);
  });
});

describe('rate limiting', () => {
  it('returns 429 with Retry-After and a JSON body after the limit', async () => {
    const app = makeTestApp({ apiKeys: ['k1'], rateLimitMax: 3 });
    const codes = [];
    let last;
    for (let i = 0; i < 5; i++) {
      last = await request(app).get('/cafeteria/menu').set('X-API-Key', 'k1');
      codes.push(last.status);
    }
    expect(codes).toEqual([200, 200, 200, 429, 429]);
    expect(Number(last.headers['retry-after'])).toBeGreaterThan(0);
    expect(last.body).toMatchObject({ message: 'Too many requests' });
  });
});

describe('GET /stats', () => {
  it('needs a key', async () => {
    expect((await request(makeTestApp()).get('/stats')).status).toBe(401);
  });

  it('counts requests per route pattern and splits 4xx from 5xx', async () => {
    const app = makeTestApp();
    await request(app).get('/cafeteria/orders/ord-5001').set('X-API-Key', TEST_KEY);
    await request(app).get('/cafeteria/orders/ord-9999').set('X-API-Key', TEST_KEY);
    await request(app).get('/cafeteria/menu');
    const res = await request(app).get('/stats').set('X-API-Key', TEST_KEY);
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(3);
    expect(res.body.routes['GET /cafeteria/orders/:id']).toMatchObject({ count: 2, clientErrors: 1, serverErrors: 0 });
    expect(res.body.routes['GET (no route)'].clientErrors).toBeGreaterThanOrEqual(1);
    expect(typeof res.body.errorRatePercent).toBe('number');
  });
});
