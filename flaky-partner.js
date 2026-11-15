// Stand-in PharmaLink for Week 11 drills. Run: node flaky-partner.js
// Switch mode without restarting: curl http://localhost:4000/__mode/slow   (ok | slow | flaky | error)
// Point server/.env at it: PHARMALINK_URL=http://localhost:4000
const express = require('express');
const app = express();
let mode = 'ok';
let calls = 0;
const medicines = [
  { id: 1, name: 'Paracetamol 500mg', category: 'Pain relief', stockLevel: 60, unitPrice: 50, status: 'in_stock', pharmacyId: 1, pharmacyName: 'AfyaCare Pharmacy', area: 'Nairobi CBD', updatedAt: '2026-11-10T08:00:00.000Z' },
  { id: 2, name: 'Paracetamol 500mg', category: 'Pain relief', stockLevel: 4, unitPrice: 45, status: 'low_stock', pharmacyId: 6, pharmacyName: 'GreenCross Clinic Pharmacy', area: 'Nairobi CBD', updatedAt: '2026-11-10T08:00:00.000Z' }
];

app.get('/__mode/:m', (req, res) => {
  mode = req.params.m;
  calls = 0;
  res.json({ mode });
});

app.get('/medicines', async (req, res) => {
  calls += 1;
  console.log(`GET /medicines (call ${calls}, mode ${mode})`);
  if (mode === 'slow') await new Promise((r) => setTimeout(r, 10000));
  if (mode === 'flaky' && calls % 3 !== 0) return res.status(503).json({ message: 'Try again' });
  if (mode === 'error') return res.status(500).json({ message: 'Internal error' });
  res.json(medicines);
});

app.listen(4000, () => console.log('Stand-in partner on http://localhost:4000'));
