const { makeTestApp, withKey } = require('../test-support/withKey');

let app;
beforeEach(() => {
  app = makeTestApp();
});

describe('GET /cafeteria/menu', () => {
  it('returns 200 and a list of menu items in the contract shape', async () => {
    const res = await withKey(app).get('/cafeteria/menu');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    for (const item of res.body) {
      expect(Object.keys(item).sort()).toEqual(['itemId', 'itemType', 'name', 'price']);
      expect(typeof item.itemId).toBe('string');
      expect(['food', 'medicine']).toContain(item.itemType);
      expect(typeof item.name).toBe('string');
      expect(Number.isInteger(item.price)).toBe(true);
    }
  });

  it('includes available food and medicine items', async () => {
    const res = await withKey(app).get('/cafeteria/menu');
    const ids = res.body.map((m) => m.itemId);
    expect(ids).toEqual(expect.arrayContaining(['food-1', 'med-101']));
  });

  it('edge case: hides an item that is not available (med-104)', async () => {
    const res = await withKey(app).get('/cafeteria/menu');
    expect(res.body.map((m) => m.itemId)).not.toContain('med-104');
  });

  it('does not leak the internal "available" flag', async () => {
    const res = await withKey(app).get('/cafeteria/menu');
    expect(res.body[0]).not.toHaveProperty('available');
  });
});

describe('unknown routes', () => {
  it('returns 404 with a JSON message', async () => {
    const res = await withKey(app).get('/cafeteria/nothing-here');
    expect(res.status).toBe(404);
    expect(typeof res.body.message).toBe('string');
  });
});
