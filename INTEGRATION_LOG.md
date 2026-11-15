# Integration Log (Week 10)

Upstream partner: **PharmaLink** (`openapi.yaml` v1.2.0). Our feature: the **Find medicine** page (`find_medicine.html`) and the pharmacy map/details pages show live stock and pharmacies from PharmaLink. Our server (`server/`) calls PharmaLink; the browser only calls our server, so their key is never in page code. `PHARMALINK_URL` and `PHARMALINK_API_KEY` come from `server/.env` (placeholders in `server/.env.example`).

First call, outside our app:
```
curl -i -H "X-API-Key: <the-key-they-gave-us>" "http://localhost:5000/medicines?q=paracetamol"
200, list of medicines with id, name, stockLevel, unitPrice, pharmacyName ... as in their contract
```

| # | What broke (symptom) | Root cause | Fix | Whose code, who fixed it |
| :-- | :--- | :--- | :--- | :--- |
| 1 | Our app only ever showed sample data; with the mock off, every medicine search failed | Our `server/pharmalink.js` called endpoints we had guessed (`/medicines?name=`, `/inventory?medicineId=`, `/reservations`), none of which are in PharmaLink's contract. It also sent no API key | Rewrote it to call `/medicines?q=`, `/pharmacies`, `/pharmacies/{id}` with `X-API-Key`, and removed the sample-data mock | Ours, fixed by us |
| 2 | Searches returned 404 from PharmaLink | Before their Week 6 fix, PharmaLink served `/api/stock/search`, not the `/medicines` path in their contract | They implemented the contract paths | PharmaLink's, fixed by PharmaLink |
| 3 | Prices and stock showed blank | Our code read `price`/`quantity`; their contract says `unitPrice`/`stockLevel` | Mapping now uses the contract's field names exactly | Ours, fixed by us |
| 4 | "Reserve for pickup" could never work | PharmaLink's partner API has no reservation endpoint | Removed the button; the page links to directions instead. Asked PharmaLink whether a reservation endpoint is planned | Contract gap, flagged to PharmaLink |

Tested on purpose:

| Test | Result |
| :--- | :--- |
| Wrong key (`PHARMALINK_API_KEY=wrong`) | Page shows "Pharmacy data is unavailable right now"; our log says `pharmalink returned 401 for /medicines`, so we know it is the key |
| PharmaLink stopped | Same friendly message (502 from our route); log says `pharmalink call failed: ECONNREFUSED`; our other routes keep answering |
| PharmaLink restarted | Data comes back on the next search, no code change |
| Unknown pharmacy id | 404 passed through to the page |

Demo: live search → stop PharmaLink → message → restart → data back.

_Add anything that came up in the live lab session with the PharmaLink team (times, extra bugs, our downstream partner's issues with our API)._
