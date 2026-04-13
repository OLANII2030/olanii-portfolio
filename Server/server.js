require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const { initDB, saveDB, getDB } = require('./db');
const { sendResume, createTransporter } = require('./mailer');
const { google } = require('googleapis');


const app = express();
app.set('trust proxy', 1); // add this line
let db;
initDB().then(database => { db = database; });

// ─── Ensure data folder exists ────────────────────────
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

// ─── Rate Limiters ───────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests. Please try again later.' }
});

const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many submissions. Please wait before trying again.' }
});

// ─── Middleware ───────────────────────────────────────
app.use(generalLimiter);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'Public')));

// ─── Routes ───────────────────────────────────────────
app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'Public', 'home.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'Public', 'about.html'));
});

app.get('/projects', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'Public', 'projects.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'Public', 'contact.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/thank-you', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'thank-you.html'));
});

// ─── Resume form submit ───────────────────────────────
app.post('/submit', submitLimiter, async (req, res) => {
  const { full_name, company, email } = req.body;

  if (!full_name || !email || typeof full_name !== 'string' || typeof email !== 'string') {
    return res.status(400).json({ error: 'Full name and email are required text fields.' });
  }

  if (full_name.length > 100 || email.length > 100 || (company && (typeof company !== 'string' || company.length > 100))) {
    return res.status(400).json({ error: 'Input is too long. Maximum 100 characters allowed.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  try {
    // ─── Save to database ────────────────────────────
    db.run(
      `INSERT INTO leads (full_name, company, email, ip_address) VALUES (?, ?, ?, ?)`,
      [
        full_name.trim(),
        company ? company.trim() : null,
        email.trim().toLowerCase(),
        req.ip
      ]
    );
    saveDB();

    // ─── Send resume via Gmail ───────────────────────
    await sendResume({
      fullName: full_name.trim(),
      company: company ? company.trim() : null,
      email: email.trim().toLowerCase()
    });

    // ─── Append to Google Sheet ──────────────────────
    await appendToSheet({
      fullName: full_name.trim(),
      company: company ? company.trim() : null,
      email: email.trim().toLowerCase()
    });

    res.redirect('/thank-you');

  } catch (err) {
    console.error('Error processing submission:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// ─── Google Sheets ────────────────────────────────────
async function appendToSheet({ fullName, company, email }) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  auth.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });

  const sheets = google.sheets({ version: 'v4', auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Sheet1!A:D',
    valueInputOption: 'RAW',
    resource: {
      values: [[
        fullName,
        company || '',
        email,
        new Date().toLocaleString()
      ]]
    }
  });
}

// ─── Admin: view all leads ────────────────────────────
app.get('/admin/leads', submitLimiter, (req, res) => {
  const leads = db.exec('SELECT * FROM leads ORDER BY sent_at DESC')[0]?.values || [];
  res.json({ count: leads.length, leads });
});

// ─── Start server ─────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Resume gate running at http://localhost:${PORT}\n`);
});
