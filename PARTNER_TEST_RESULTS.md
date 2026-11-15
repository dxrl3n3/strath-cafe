# Partner Test Results (Week 7)

## Our own suite
`npm test` runs 55 jest + supertest tests in `__tests__/` (menu, orders, student history): happy path, every validation rule, 404s and edge cases. All pass. Breaking the code on purpose (renaming `total`, returning 200 instead of 404) makes tests fail, so the assertions are strong enough.

## Our tests against PharmaLink (upstream)
`partner-tests/pharmalink.test.js` was written from PharmaLink's `openapi.yaml` (v1.1.0) only. Run with:

```
PARTNER_URL=http://<pharmalink-host>:5000 npm run test:partner
```

Result against their running API: **16 of 16 passed**.

| Finding | Type | Outcome |
| :--- | :--- | :--- |
| Before Week 6 their server did not serve the contract paths at all (`/api/stock/search` instead of `/medicines`) | Real bug (implementation did not match contract) | Fixed on their side in Week 6; tests now pass |
| Contract said `id` is a string but ids are integers | Contract ambiguity | Contract changed to integer (their CONTRACT_DEVIATIONS.md row 4) |

## PharmaLink's tests against our API
_Fill in after PharmaLink runs their tests against our running server: what failed, and whether each one is a real bug, a contract ambiguity, or a misunderstanding. "All passed" is a valid result._
