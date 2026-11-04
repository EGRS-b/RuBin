const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'RuBin API',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`RuBin server is running on http://localhost:${PORT}`);
});