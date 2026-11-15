# Resilience Notes (Week 11)

Feature: **Find medicine** (`find_medicine.html` → our `server/` route `GET /api/pharmalink/medicines` → PharmaLink `GET /medicines`). Partner calls go through `server/resilientFetch.js`. Drills used the stand-in `flaky-partner.js` on port 4000 (`PHARMALINK_URL=http://localhost:4000`).

## Before (Week 10 code)
- **Slow:** the page waited the full 10 seconds for the stand-in to answer.
- **Flaky:** 2 out of 3 searches failed with the error message, although a second try would have worked.

## After

| Failure | What the user saw | What our log said |
| :--- | :--- | :--- |
| Partner normal (`ok`) | Live results in 0.04 s | nothing |
| Flaky (503, 503, then 200) | Live results after 0.61 s; no error shown | `attempt 1 failed, retrying in 200 ms`, `attempt 2 failed, retrying in 400 ms` |
| Always 500 (`error`), after one good search | Saved results with the banner "Showing saved stock from <time>. PharmaLink is not responding" after 0.61 s | 2 retries, then `pharmalink returned 500 for /medicines`. Exactly 3 calls, no loop |
| Slow (10 s), after one good search | Saved results with the banner after 5.1 s | 2 retries, then `pharmalink call failed: timeout` |
| Slow, after our server restarted (nothing saved) | "Pharmacy data is unavailable right now. Please try again in a minute." after 5.1 s | `pharmalink call failed: timeout` |
| Partner stopped, nothing saved | Same friendly message after 0.6 s | `pharmalink call failed: ECONNREFUSED` |
| Wrong key (401) | Friendly message at once; **no retries** (4xx is not retried) | `pharmalink returned 401 for /medicines` |

## Numbers and why
- A normal call to the partner took **0.007 s** locally (well under half a second on the lab network).
- **Timeout 1500 ms**: far above a normal answer, short enough that a hung partner is cut off quickly.
- **2 retries**, waiting **200 ms then 400 ms**; honours `Retry-After` on 429 (up to 5 s). Only GETs are retried, and only on timeouts, connection errors and 429/500/502/503/504.
- **Worst case:** 3 × 1500 + 200 + 400 = **5100 ms**, which we measured (5.1 s). Acceptable for a search a student starts on purpose; if it felt too long we would drop to 1 retry (3.2 s).

## What a user would experience without this
A student opens Find medicine at lunch, types "paracetamol" and presses Search. With PharmaLink slow, the page just sits there for 10 seconds or more with no sign of progress, and most students would leave or press Search again (making it worse for PharmaLink). With PharmaLink flaky, two in three searches show an error even though the data was one retry away, so the student assumes the feature is broken. Now they either get results within about five seconds, or the last good results clearly labelled as saved with the time, or a plain message telling them to try again in a minute.

## What we did not build
A circuit breaker would stop calling PharmaLink for a while after repeated failures and only test it occasionally, so users would get the saved copy instantly instead of waiting 5.1 s each time while PharmaLink is down; ours still tries every request up to three times.

## Real partner drill
_Fill in after running the same drill with the PharmaLink team: normal, stopped (saved data + banner), restarted (live again, no code change), and how many hits per page load they saw (should be at most 3)._ `PHARMALINK_URL` points back at PharmaLink.
