const request = require('supertest');
const { createApp } = require('../app');

const TEST_KEY = 'test-key-for-jest';

// A fresh in-memory app (seed data, nothing written to disk) that accepts TEST_KEY.
function makeTestApp(options = {}) {
  return createApp(null, { apiKeys: [TEST_KEY], rateLimitMax: 100000, ...options });
}

// Like request(app), but every call sends a valid X-API-Key header.
function withKey(app, key = TEST_KEY) {
  const api = {};
  for (const m of ['get', 'post', 'put', 'patch', 'delete']) api[m] = (url) => request(app)[m](url).set('X-API-Key', key);
  return api;
}

module.exports = { TEST_KEY, makeTestApp, withKey };
