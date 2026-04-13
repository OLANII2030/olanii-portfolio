const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

const OAuth2 = google.auth.OAuth2;

async function createTransporter() {
  const oauth2Client = new OAuth2(
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

async function sendResume({ fullName, company, email }) {
  const transporter = await createTransporter();

  const companyLine = company
    ? `I also noticed you're with <strong>${company}</strong> — looking forward to any potential conversations.`
    : `Feel free to reach out if you'd like to connect.`;

  const mailOptions = {
    from: `Olanii Tsegaye <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `Here's my resume, ${fullName.split(' ')[0]}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">

        <p style="font-size: 16px; line-height: 1.7;">Hi ${fullName.split(' ')[0]},</p>

        <p style="font-size: 15px; line-height: 1.75; color: #444;">
          Thanks for taking a moment — my resume is attached to this email.
          ${companyLine}
        </p>

        <p style="font-size: 15px; line-height: 1.75; color: #444;">
          I'm always open to the right conversations, whether that's a project,
          a role, or just a good exchange of ideas.
        </p>

        <p style="font-size: 15px; line-height: 1.75; color: #444;">
          You can reply directly to this email — it comes straight to me.
        </p>

        <p style="margin-top: 32px; font-size: 15px; color: #1a1a1a;">
          — Olanii
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />

        <p style="font-size: 12px; color: #999;">
          Olanii Tsegaye &nbsp;·&nbsp; Full-Stack Web Developer &nbsp;·&nbsp; Addis Ababa, Ethiopia
        </p>

      </div>
    `,
    attachments: [
      {
        filename: 'Olanii-Tsegaye-Resume.pdf',
        path: path.resolve(process.env.RESUME_PATH)
      }
    ]
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { sendResume };