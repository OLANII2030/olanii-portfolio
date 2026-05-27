require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Trust Proxy ──────────────────────────────────────────────
// Required for rate limiting to work correctly on Railway
// Without this, every request looks like it comes from the same IP
app.set('trust proxy', 1);

// ─── Rate Limiters ────────────────────────────────────────────
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,                  // 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' }
});

const formLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,                    // 5 form submissions per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many submissions. Please wait before trying again.' }
});

// Apply general limiter to all routes
app.use(generalLimiter);

// ─── Middleware ───────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'Public'), { index: false }));

// ─── Input Sanitizer ─────────────────────────────────────────
// Escapes HTML characters so nothing malicious can be injected
// into your email templates
function sanitize(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .trim();
}

// ─── Email Transporter ────────────────────────────────────────
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

// ─── Page Routes ─────────────────────────────────────────────
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'Public', 'index.html'));
});

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

app.get('/thank-you', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'Public', 'thank-you.html'));
});

app.get('/contact-sent', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'Public', 'contact-sent.html'));
});

// ─── Resume Gate ──────────────────────────────────────────────
app.post('/submit', formLimiter, async (req, res) => {
    // Honeypot check — bots fill everything, humans leave this blank
    if (req.body.website) {
        return res.redirect('/thank-you'); // fake success, send nothing
    }

    const full_name = sanitize(req.body.full_name);
    const email = sanitize(req.body.email);
    const company = sanitize(req.body.company || '');

    if (!full_name || !email) {
        return res.status(400).json({ error: 'Name and email are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (full_name.length > 100 || email.length > 100 || company.length > 100) {
        return res.status(400).json({ error: 'Input too long.' });
    }

    try {
        await transporter.sendMail({
            from: `Olanii Tsegaye <${process.env.GMAIL_USER}>`,
            to: email,
            subject: `Here's my resume, ${full_name.split(' ')[0]}`,
            html: `
        <div style="font-family: Inter, sans-serif; max-width: 560px; color: #1a1a1a;">
          <p>Hi ${full_name.split(' ')[0]},</p>
          <p>Thanks for your interest — my resume is attached to this email.</p>
          ${company ? `<p>I noticed you're with <strong>${company}</strong> — looking forward to any potential conversations.</p>` : ''}
          <p>Feel free to reply directly to this email if you'd like to connect.</p>
          <p>— Olanii</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="font-size: 12px; color: #999;">Olanii Tsegaye · Full-Stack Developer · Addis Ababa, Ethiopia</p>
        </div>
      `,
            attachments: [
                {
                    filename: 'Olanii-Tsegaye-Resume.pdf',
                    path: path.resolve(process.env.RESUME_PATH)
                }
            ]
        });

        res.redirect('/thank-you');

    } catch (err) {
        console.error('Resume email error:', err);
        res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
});

// ─── Contact Form ─────────────────────────────────────────────
app.post('/contact', formLimiter, async (req, res) => {
    // Honeypot check
    if (req.body.website) {
        return res.redirect('/contact-sent'); // fake success, send nothing
    }

    const full_name = sanitize(req.body.full_name);
    const email = sanitize(req.body.email);
    const type = sanitize(req.body.type || '');
    const company = sanitize(req.body.company || '');
    const message = sanitize(req.body.message || '');

    if (!full_name || !email) {
        return res.status(400).json({ error: 'Name and email are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (full_name.length > 100 || email.length > 100 ||
        company.length > 100 || message.length > 2000) {
        return res.status(400).json({ error: 'Input too long.' });
    }

    try {
        await transporter.sendMail({
            from: `Portfolio Contact <${process.env.GMAIL_USER}>`,
            to: process.env.GMAIL_USER,
            replyTo: email,
            subject: `New message from ${full_name}${company ? ` — ${company}` : ''}`,
            html: `
        <div style="font-family: Inter, sans-serif; max-width: 560px; color: #1a1a1a;">
          <p style="font-size: 13px; color: #999;">New contact form submission</p>
          <p><strong>Name:</strong> ${full_name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Type:</strong> ${type === 'company' ? 'Company' : 'Individual'}</p>
          ${company ? `<p><strong>Company:</strong> ${company}</p>` : ''}
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          ${message
                    ? `<p><strong>Message:</strong><br/>${message}</p>`
                    : '<p style="color: #999;"><em>No message provided.</em></p>'
                }
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999;">Reply directly to this email to respond to ${full_name}.</p>
        </div>
      `
        });

        res.redirect('/contact-sent');

    } catch (err) {
        console.error('Contact email error:', err);
        res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
});

// ─── Start Server ─────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  Server running at http://localhost:${PORT}\n`);
});