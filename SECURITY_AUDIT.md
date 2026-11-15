# Security Audit (Week 9)

## Keys
- Consumers: our own team (testing) and the PharmaLink team. One key each, in `.env` as `API_KEYS=...`; `.env` is in `.gitignore`, `.env.example` has placeholders. The server prints how many keys loaded, never the keys.
- Every `/cafeteria/...` route, reads and writes, needs `X-API-Key`. Open on purpose: `/health` (only `{"status":"ok"}`) and `/docs` + `/openapi.yaml` (our published contract).
- Proof: no key → 401, wrong key → 401, valid key → 200 (see `__tests__/security.test.js` and the curl commands in README).

## Rate limit
100 requests per minute per key, in memory. A student app loads the menu and an order or two per screen; 100 a minute covers a busy screen many times over but stops a broken loop. With the limit set to 3, five quick requests give `200 200 200 429 429`, and the 429 has a `Retry-After` header and `{ "message": "Too many requests", "retryAfter": n }` (tested). Limits: resets on restart, not shared across server copies.

## Self-audit

| Checked | Found | Fixed |
| :--- | :--- | :--- |
| Sensitive fields | Menu hides the internal `available` flag; orders hold a student id but no names, emails or passwords | Nothing to fix |
| Other people's data by changing an id | Anyone with a key can read any order or any student's history by changing `studentId` / order id. With one access level per team this is by design, but a student-facing app must only show a student their own orders | Documented. Needs per-student login (the web app in `server/` already does this with JWT) |
| Error messages | 500 returns a fixed message; invalid JSON returns a fixed message; no stack traces or paths | Nothing to fix |
| Extra fields on writes | POST copies only `studentId` and the 3 item fields, prices come from the menu; PATCH ignores everything but `status` (tests prove it) | Nothing to fix |
| Keys in the wrong place | None in repo, history, README or logs. The web app (`server/`) keeps the PharmaLink key in its own `.env`, never in browser code | Nothing to fix |

Whole suite after the change: 61 tests passed.
