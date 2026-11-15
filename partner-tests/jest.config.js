// Tests written from PharmaLink's openapi.yaml, run against their real, running API.
// Run: PARTNER_URL=http://localhost:5000 npm run test:partner
module.exports = {
  rootDir: __dirname,
  testMatch: ['<rootDir>/**/*.test.js'],
  testEnvironment: 'node'
};
