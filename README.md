# Strathmore Cafeteria API

Lets Strathmore students order cafeteria food and basic medicines online, and track their orders. This API is for apps that place or track student orders. The repo also holds our web app (`frontend/` + `server/`), which shows live medicine stock from our partner, PharmaLink.

- Docs site: `docs/index.html` (GitHub Pages), or run the API and open http://localhost:3001/docs
- Contract: `openapi.yaml` (copy for the docs site in `docs/openapi.yaml`; keep them the same)

## Run it locally (clean clone)

Needs Node.js 18+. No database: orders are saved in `data.json` (delete it to reset to the demo data).

```bash
git clone https://github.com/dxrl3n3/StrathCafe.git
cd StrathCafe
cp .env.example .env   # then set API_KEYS
npm install
npm start          # API on http://localhost:3001
```

Check it works:

```bash
curl -H "X-API-Key: <your-api-key>" http://localhost:3001/cafeteria/menu
```

Run the tests: `npm test`

## Authentication

Every request except `/health` and `/docs` needs your team's key in the `X-API-Key` header. Ask us for a key privately; each consuming team gets its own. Never put a key in a repo, README or browser code.

```bash
curl -H "X-API-Key: <your-api-key>" http://localhost:3001/cafeteria/menu
```

| Situation | Response |
| :--- | :--- |
| No key or wrong key | `401 { "message": "Missing or invalid API key" }` |
| More than 100 requests in one minute with one key | `429 { "message": "Too many requests", "retryAfter": 42 }` plus a `Retry-After: 42` header (seconds) |

Running it yourself: put your keys in `.env` as `API_KEYS=key1,key2` (see `.env.example`). Generate a key with `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`.

## Examples

**Menu** — `GET /cafeteria/menu`

```
200
[ { "itemId": "food-1", "itemType": "food", "name": "Chicken Pilau", "price": 350 },
  { "itemId": "med-101", "itemType": "medicine", "name": "Paracetamol 500mg (strip)", "price": 50 }, ... ]
```

**Place an order** — `POST /cafeteria/orders`

```
body: { "studentId": "std-1001", "items": [ { "itemId": "food-1", "itemType": "food", "quantity": 2 } ] }
201  Location: /cafeteria/orders/ord-5002
     { "id": "ord-5002", "studentId": "std-1001",
       "items": [ { "itemId": "food-1", "itemType": "food", "name": "Chicken Pilau", "quantity": 2, "unitPrice": 350 } ],
       "status": "pending", "total": 700, "createdAt": "...", "updatedAt": "..." }
```

**Track an order** — `GET /cafeteria/orders/ord-5001` → `200` order. `GET /cafeteria/orders/ord-9999` → `404 { "message": "Order ord-9999 not found" }`

**Update status** — `PATCH /cafeteria/orders/ord-5001` with `{ "status": "fulfilled" }` (`pending`, `fulfilled`, `cancelled`) → `200` updated order

**Student history** — `GET /cafeteria/students/std-8842/orders` → `200` list (empty list if none)

## Monitoring: GET /stats

Needs a key like every other route. Counts reset when the server restarts.

```bash
curl -H "X-API-Key: <your-api-key>" http://localhost:3001/stats
```
```
{ "startedAt": "2026-11-12T05:19:18.119Z", "uptimeSeconds": 73, "total": 181, "clientErrors": 74, "serverErrors": 0,
  "errorRatePercent": 0, "avgMs": 1.7,
  "routes": { "GET /cafeteria/orders/:id": { "count": 51, "clientErrors": 21, "serverErrors": 0, "avgMs": 0.6, "maxMs": 2.4 }, ... } }
```

Every request is also logged as one JSON line (no keys, no query strings). To keep a log: `node server.js | tee requests.log` (`*.log` is git-ignored). Generate test traffic: `API=http://localhost:3001 KEY=<your-api-key> node traffic.js`.

## Errors

Every error is `{ "message": "<what went wrong>" }`.

| Status | When | Example |
| :--- | :--- | :--- |
| 400 | Missing field, wrong type, bad value, unknown or unavailable item, invalid JSON | `{ "message": "items[0].quantity must be between 1 and 100" }` |
| 401 | Missing or invalid `X-API-Key` | `{ "message": "Missing or invalid API key" }` |
| 404 | Order or path does not exist | `{ "message": "Order ord-9999 not found" }` |
| 429 | Rate limit hit | `{ "message": "Too many requests", "retryAfter": 42 }` |
| 500 | Our bug | `{ "message": "Something went wrong on the server" }` |

## Web app (server/ and frontend/)

`server/` is the web app backend (MySQL, student/admin/kitchen logins). See `server/.env.example`. `npm install && npm run init-db && npm start` inside `server/`. The pages in `frontend/` call it via `js/config.js`.

## Course files

`CONTRACT_DEVIATIONS.md`, `PARTNER_TEST_RESULTS.md`, `BLIND_TEST_REPORT.md`, `SECURITY_AUDIT.md`, `INTEGRATION_LOG.md`, `RESILIENCE_NOTES.md`, `MONITORING_NOTES.md`
