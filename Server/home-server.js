require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const path = require('path');

const app = express();

app.use(express.static(path.join(__dirname, '..', 'public'), { index: false }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'home.html'));
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`\n  Home server running at http://localhost:${PORT}\n`);
});
