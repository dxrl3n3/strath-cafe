# Monitoring Notes (Week 12)

## Predictions (written before any data)
1. Slowest endpoint: `GET /cafeteria/students/{studentId}/orders`, because it filters every order.
2. Most errors: `GET /cafeteria/orders/{id}`, because apps poll for orders that do not exist yet or were mistyped.

## How the data was collected
`monitoring.js` logs one JSON line per request (time, method, path without query string, status, ms, caller as a hashed `key-xxxxxx` label) and keeps totals for `GET /stats`. `monitor` runs before the key check, so 401s and 429s are logged too. Traffic: `traffic.js` run twice at the same time with two different keys (our team's and our partner's), plus requests with no key. `grep -c <key> requests.log` printed 0 for every key.

Sample log lines:
```
{"time":"...","method":"GET","path":"...","status":200,"ms":...,"caller":"key-309c3b"}
{"time":"...","method":"GET","path":"...","status":401,"ms":0.8,"caller":"none"}
```

`/stats` after the run:
```json
{
  "startedAt": "2026-11-12T05:19:18.091Z",
  "uptimeSeconds": 73,
  "total": 210,
  "clientErrors": 106,
  "serverErrors": 0,
  "errorRatePercent": 0,
  "avgMs": 0.6,
  "routes": {
    "GET /cafeteria/menu": {
      "count": 48,
      "clientErrors": 0,
      "serverErrors": 0,
      "avgMs": 0.7,
      "maxMs": 8.1
    },
    "GET /cafeteria/orders/:id": {
      "count": 51,
      "clientErrors": 21,
      "serverErrors": 0,
      "avgMs": 0.6,
      "maxMs": 2.4
    },
    "GET (no route)": {
      "count": 85,
      "clientErrors": 85,
      "serverErrors": 0,
      "avgMs": 0.5,
      "maxMs": 2.9
    },
    "GET /cafeteria/students/:studentId/orders": {
      "count": 26,
      "clientErrors": 0,
      "serverErrors": 0,
      "avgMs": 0.6,
      "maxMs": 1.1
    }
  }
}
```

## Predicted vs actual
Prediction wrong on speed: student history averaged 0.6 ms, the same as the rest, because there are only a few orders. Most errors: `GET /cafeteria/orders/:id`, as predicted (21 of 51).

## One real pattern
Everything is fast because the data is in memory: overall average 0.6 ms. `GET /cafeteria/menu` had the slowest single call (8.1 ms, the first request after start-up) though its average was 0.7 ms. `GET /cafeteria/orders/:id` failed most often: 21 of 51 calls were 404s (ord-9999). The `(no route)` row holds 85 rejected requests: the no-key 401s (caller `none`) plus `/not-a-route` 404s. No 5xx, so the error rate is 0%.

## Why, and what I would check next
The first call is slower because Express and the JSON serializer warm up; after that every route is under 1 ms. Next I would place a few hundred orders and see whether student history (which scans every order) slows down.

## One production alert
Alert on a 5xx error rate above 2% for 5 minutes. A 5xx here means our own code failed (there is no database to blame), so the alert should page whoever deployed last. The web app keeps working for food orders even if the medicine side (PharmaLink) is down, because that feature falls back to saved data.

_Replace the numbers with your own run in the lab (with your ring partner's traffic) if they differ._
