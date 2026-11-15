require('dotenv').config();
const path = require('path');
const { createApp } = require('./app');

const port = Number(process.env.PORT || 3001);
const app = createApp(path.join(__dirname, 'data.json'));
console.log('Loaded ' + (process.env.API_KEYS || '').split(',').filter(Boolean).length + ' API key(s)');

app.listen(port, () => {
  console.log('Cafeteria API running at http://localhost:' + port);
  console.log('API docs (Swagger UI) at http://localhost:' + port + '/docs');
});
