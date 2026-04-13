const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const { google } = require('googleapis');

const app = express();

// ─── Rate Limiters ───────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please try again later.' }
});

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many messages sent. Please wait before trying again.' }
});

app.use(generalLimiter);
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

async function createTransporter() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  const accessToken = await oauth2Client.getAccessToken();
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.GMAIL_USER,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
      accessToken: accessToken.token
    }
  });
}

app.post('/home-contact', contactLimiter, async (req, res) => {
  const { full_name, email, type, company, message } = req.body;

  if (!full_name || !email || typeof full_name !== 'string' || typeof email !== 'string') {
    return res.status(400).json({ error: 'Name and email are required text fields.' });
  }

  if (full_name.length > 100 || email.length > 100 || 
     (company && (typeof company !== 'string' || company.length > 100)) || 
     (message && (typeof message !== 'string' || message.length > 2000))) {
    return res.status(400).json({ error: 'Input exceeds maximum allowed length.' });
  }

  try {
    const transporter = await createTransporter();
    const companyLine = company ? `<p><strong>Company:</strong> ${company}</p>` : '';
    const messageLine = message ? `<p><strong>Message:</strong><br/>${message}</p>` : '<p><em>No message.</em></p>';

    await transporter.sendMail({
      from: `Home Contact <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      replyTo: email,
      subject: `New message from ${full_name}${company ? ` — ${company}` : ''}`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 560px; color: #1a1a1a;">
          <p><strong>Name:</strong> ${full_name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Type:</strong> ${type === 'company' ? 'Company' : 'Individual'}</p>
          ${companyLine}
          <hr/>
          ${messageLine}
        </div>
      `
    });

    res.json({ success: true });

  } catch (err) {
    console.error('Home contact error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

const PORT = 3003;
app.listen(PORT, () => {
  console.log(`\n  Home contact server running at http://localhost:${PORT}\n`);
});
