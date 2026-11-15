const { makeTestApp, withKey } = require('../test-support/withKey');

let app;
beforeEach(() => {
  app = makeTestApp();
});

const goodOrder = () => ({
  studentId: 'std-1001',
  items: [
    { itemId: 'food-1', itemType: 'food', quantity: 2 },
    { itemId: 'med-101', itemType: 'medicine', quantity: 1 }
  ]
});

function expectOrderShape(order) {
  expect(order).toEqual(
    expect.objectContaining({
      id: expect.stringMatching(/^ord-\d+$/),
      studentId: expect.any(String),
      items: expect.any(Array),
      status: expect.stringMatching(/^(pending|fulfilled|cancelled)$/),
      total: expect.any(Number),
      createdAt: expect.any(String),
      updatedAt: expect.any(String)
    })
  );
  expect(Number.isNaN(Date.parse(order.createdAt))).toBe(false);
  for (const line of order.items) {
    expect(Object.keys(line).sort()).toEqual(['itemId', 'itemType', 'name', 'quantity', 'unitPrice']);
  }
}

const countOrders = async (studentId) => (await withKey(app).get(`/cafeteria/students/${studentId}/orders`)).body.length;

describe('GET /cafeteria/orders/{id}', () => {
  it('returns 200 and the order in the contract shape', async () => {
    const res = await withKey(app).get('/cafeteria/orders/ord-5001');
    expect(res.status).toBe(200);
    expectOrderShape(res.body);
    expect(res.body.id).toBe('ord-5001');
    expect(res.body.total).toBe(100);
  });

  it('returns 404 with a message for an order that does not exist', async () => {
    const res = await withKey(app).get('/cafeteria/orders/ord-9999');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('message');
  });
});

describe('POST /cafeteria/orders', () => {
  it('creates the order: 201, Location header, correct total', async () => {
    const res = await withKey(app).post('/cafeteria/orders').send(goodOrder());
    expect(res.status).toBe(201);
    expectOrderShape(res.body);
    expect(res.body.status).toBe('pending');
    expect(res.body.total).toBe(750); // 2 x 350 + 1 x 50
    expect(res.headers.location).toBe(`/cafeteria/orders/${res.body.id}`);
  });

  it('really stores the order (re-fetch with GET)', async () => {
    const created = await withKey(app).post('/cafeteria/orders').send(goodOrder());
    const res = await withKey(app).get(`/cafeteria/orders/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(created.body);
  });

  it('uses menu names and prices, not anything the caller sends', async () => {
    const body = { studentId: 'std-1001', items: [{ itemId: 'food-3', itemType: 'food', quantity: 1, unitPrice: 1, name: 'Free' }] };
    const res = await withKey(app).post('/cafeteria/orders').send(body);
    expect(res.status).toBe(201);
    expect(res.body.items[0].unitPrice).toBe(120);
    expect(res.body.items[0].name).toBe('Beef Samosa (2pcs)');
  });

  it('edge case: accepts the maximum quantity of 100', async () => {
    const res = await withKey(app)
      .post('/cafeteria/orders')
      .send({ studentId: 'std-1001', items: [{ itemId: 'food-3', itemType: 'food', quantity: 100 }] });
    expect(res.status).toBe(201);
    expect(res.body.total).toBe(12000);
  });

  const items = goodOrder().items;
  const line = (overrides) => ({ studentId: 'std-1001', items: [{ itemId: 'food-1', itemType: 'food', quantity: 1, ...overrides }] });
  const badBodies = [
    ['an empty object', {}],
    ['missing studentId', { items }],
    ['missing items', { studentId: 'std-1001' }],
    ['studentId as a number', { studentId: 1001, items }],
    ['an empty studentId', { studentId: '', items }],
    ['a studentId of only spaces', { studentId: '   ', items }],
    ['a studentId over 50 characters', { studentId: 'x'.repeat(51), items }],
    ['items as a string', { studentId: 'std-1001', items: 'med-101' }],
    ['an empty items array', { studentId: 'std-1001', items: [] }],
    ['an item that is not an object', { studentId: 'std-1001', items: ['med-101'] }],
    ['an item missing itemId', { studentId: 'std-1001', items: [{ itemType: 'food', quantity: 1 }] }],
    ['an item missing itemType', { studentId: 'std-1001', items: [{ itemId: 'food-1', quantity: 1 }] }],
    ['an item missing quantity', { studentId: 'std-1001', items: [{ itemId: 'food-1', itemType: 'food' }] }],
    ['itemId as a number', line({ itemId: 1 })],
    ['an empty itemId', line({ itemId: '' })],
    ['itemType not in the enum', line({ itemType: 'drink' })],
    ['quantity as a string', line({ quantity: '2' })],
    ['quantity 1.5', line({ quantity: 1.5 })],
    ['quantity 0', line({ quantity: 0 })],
    ['a negative quantity', line({ quantity: -3 })],
    ['quantity 101', line({ quantity: 101 })],
    ['quantity null', line({ quantity: null })],
    ['an itemId not on the menu', line({ itemId: 'food-999' })],
    ['an itemType that does not match the item', { studentId: 'std-1001', items: [{ itemId: 'med-101', itemType: 'food', quantity: 1 }] }],
    ['an unavailable item', { studentId: 'std-1001', items: [{ itemId: 'med-104', itemType: 'medicine', quantity: 1 }] }]
  ];

  it.each(badBodies)('returns 400 with a message for %s', async (name, body) => {
    const res = await withKey(app).post('/cafeteria/orders').send(body);
    expect(res.status).toBe(400);
    expect(typeof res.body.message).toBe('string');
    expect(res.body.message.length).toBeGreaterThan(0);
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await withKey(app).post('/cafeteria/orders').set('Content-Type', 'application/json').send('{ not json');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Request body is not valid JSON');
  });

  it('returns 400 when the body is a JSON array', async () => {
    const res = await withKey(app).post('/cafeteria/orders').send([1, 2, 3]);
    expect(res.status).toBe(400);
  });

  it('stores nothing when one item in the order is invalid', async () => {
    const before = await countOrders('std-2002');
    const res = await withKey(app)
      .post('/cafeteria/orders')
      .send({ studentId: 'std-2002', items: [{ itemId: 'food-1', itemType: 'food', quantity: 1 }, { itemId: 'food-2', itemType: 'food', quantity: 0 }] });
    expect(res.status).toBe(400);
    expect(await countOrders('std-2002')).toBe(before);
  });
});

describe('PATCH /cafeteria/orders/{id}', () => {
  it('updates the status: 200 and the updated order', async () => {
    const res = await withKey(app).patch('/cafeteria/orders/ord-5001').send({ status: 'fulfilled' });
    expect(res.status).toBe(200);
    expectOrderShape(res.body);
    expect(res.body.status).toBe('fulfilled');
    const check = await withKey(app).get('/cafeteria/orders/ord-5001');
    expect(check.body.status).toBe('fulfilled');
  });

  it('is idempotent: the same PATCH twice gives the same end state', async () => {
    await withKey(app).patch('/cafeteria/orders/ord-5001').send({ status: 'cancelled' });
    const first = (await withKey(app).get('/cafeteria/orders/ord-5001')).body;
    const again = await withKey(app).patch('/cafeteria/orders/ord-5001').send({ status: 'cancelled' });
    expect(again.status).toBe(200);
    expect((await withKey(app).get('/cafeteria/orders/ord-5001')).body).toEqual(first);
  });

  it('ignores extra fields such as studentId and total', async () => {
    const res = await withKey(app).patch('/cafeteria/orders/ord-5001').send({ status: 'fulfilled', studentId: 'std-hacker', total: 1 });
    expect(res.status).toBe(200);
    expect(res.body.studentId).toBe('std-8842');
    expect(res.body.total).toBe(100);
  });

  it.each([
    ['an empty object', {}],
    ['no status field', { note: 'hello' }],
    ['status as a number', { status: 123 }],
    ['status null', { status: null }],
    ['a status not in the enum', { status: 'shipped' }],
    ['a status with the wrong case', { status: 'Fulfilled' }],
    ['an empty status', { status: '' }]
  ])('returns 400 for %s and changes nothing', async (name, body) => {
    const before = (await withKey(app).get('/cafeteria/orders/ord-5001')).body;
    const res = await withKey(app).patch('/cafeteria/orders/ord-5001').send(body);
    expect(res.status).toBe(400);
    expect(typeof res.body.message).toBe('string');
    expect((await withKey(app).get('/cafeteria/orders/ord-5001')).body).toEqual(before);
  });

  it('returns 404 for an order that does not exist, and does not create it', async () => {
    const res = await withKey(app).patch('/cafeteria/orders/ord-9999').send({ status: 'fulfilled' });
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('message');
    expect((await withKey(app).get('/cafeteria/orders/ord-9999')).status).toBe(404);
  });

  it('validates before looking up: an invalid body on a missing order is 400', async () => {
    const res = await withKey(app).patch('/cafeteria/orders/ord-9999').send({ status: 'shipped' });
    expect(res.status).toBe(400);
  });
});
