require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
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

// ─── Middleware ───────────────────────────────────────
app.use(generalLimiter);
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Gmail OAuth2 transporter ─────────────────────────
async function createTransporter() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });

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

// ─── Routes ───────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'contact.html'));
});

app.get('/sent', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'contact-sent.html'));
});

app.post('/contact', contactLimiter, async (req, res) => {
  const { full_name, email, type, company, message } = req.body;

  if (!full_name || !email || !type || typeof full_name !== 'string' || typeof email !== 'string') {
    return res.status(400).json({ error: 'Please fill in all required text fields.' });
  }

  if (full_name.length > 100 || email.length > 100 || 
     (company && (typeof company !== 'string' || company.length > 100)) || 
     (message && (typeof message !== 'string' || message.length > 2000))) {
    return res.status(400).json({ error: 'Input exceeds maximum allowed length.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  try {
    const transporter = await createTransporter();

    const companyLine = company ? `<p><strong>Company:</strong> ${company}</p>` : '';
    const messageLine = message
      ? `<p><strong>Message:</strong><br/>${message}</p>`
      : '<p><em>No message provided.</em></p>';

    await transporter.sendMail({
      from: `Contact Form <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      replyTo: email,
      subject: `New message from ${full_name}${company ? ` — ${company}` : ''}`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 560px; color: #1a1a1a;">
          <p style="font-size: 13px; color: #999; margin-bottom: 24px;">New contact form submission</p>
          <p><strong>Name:</strong> ${full_name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Type:</strong> ${type === 'company' ? 'Company' : 'Individual'}</p>
          ${companyLine}
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          ${messageLine}
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999;">Reply directly to this email to respond to ${full_name}.</p>
        </div>
      `
    });

    res.redirect('/contact-sent.html');

  } catch (err) {
    console.error('Contact form error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── Start ────────────────────────────────────────────
const PORT = process.env.CONTACT_PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n  Contact server running at http://localhost:${PORT}\n`);
});
