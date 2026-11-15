const { makeTestApp, withKey } = require('../test-support/withKey');

let app;
beforeEach(() => {
  app = makeTestApp();
});

describe('GET /cafeteria/students/{studentId}/orders', () => {
  it('returns 200 and the seeded order for std-8842', async () => {
    const res = await withKey(app).get('/cafeteria/students/std-8842/orders');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe('ord-5001');
    expect(res.body[0].studentId).toBe('std-8842');
    expect(Array.isArray(res.body[0].items)).toBe(true);
  });

  it('edge case: returns 200 and an empty list for a student with no orders', async () => {
    const res = await withKey(app).get('/cafeteria/students/std-nobody/orders');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('includes a new order after it is created', async () => {
    await withKey(app)
      .post('/cafeteria/orders')
      .send({ studentId: 'std-3003', items: [{ itemId: 'food-2', itemType: 'food', quantity: 1 }] });
    const res = await withKey(app).get('/cafeteria/students/std-3003/orders');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].total).toBe(250);
  });

  it('only returns that student\'s orders', async () => {
    await withKey(app)
      .post('/cafeteria/orders')
      .send({ studentId: 'std-4004', items: [{ itemId: 'food-2', itemType: 'food', quantity: 1 }] });
    const res = await withKey(app).get('/cafeteria/students/std-8842/orders');
    expect(res.body.every((o) => o.studentId === 'std-8842')).toBe(true);
  });
});
