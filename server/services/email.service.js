const { getTransporter } = require('../config/email');

function formatDate(date) {
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  const tz = new Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  return (
    d.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'long' }) +
    (tz ? ` (${tz})` : '')
  );
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildMail({ name, email, message, subject, createdAt }) {
  const sentAt = formatDate(createdAt);
  const text = [
    subject,
    '',
    'A new contact message was submitted through the portfolio website.',
    '',
    'Name: ' + name,
    'Email: ' + email,
    'Subject: ' + subject,
    '',
    'Message:',
    message,
    '',
    'Date/Time: ' + sentAt
  ].join('\n');

  const html =
    '<div style="font-family:Segoe UI,Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;line-height:1.6">' +
    '<div style="background:linear-gradient(135deg,#6366f1,#22d3ee);border-radius:10px 10px 0 0;padding:20px 24px">' +
    '<h2 style="margin:0;color:#ffffff;font-size:18px">' + escapeHtml(subject) + '</h2>' +
    '</div>' +
    '<div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;padding:20px 24px">' +
    '<p style="margin:0 0 16px">A new contact message was submitted through the portfolio website.</p>' +
    '<table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px">' +
    '<tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600;width:110px">Name</td><td style="padding:8px 12px">' + escapeHtml(name) + '</td></tr>' +
    '<tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600">Email</td><td style="padding:8px 12px"><a href="mailto:' + escapeHtml(email) + '" style="color:#6366f1">' + escapeHtml(email) + '</a></td></tr>' +
    '<tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600">Subject</td><td style="padding:8px 12px">' + escapeHtml(subject) + '</td></tr>' +
    '<tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600;vertical-align:top">Message</td><td style="padding:8px 12px;white-space:pre-wrap">' + escapeHtml(message) + '</td></tr>' +
    '<tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600;vertical-align:top">Date/Time</td><td style="padding:8px 12px">' + escapeHtml(sentAt) + '</td></tr>' +
    '</table>' +
    '</div>' +
    '</div>';

  return { text, html };
}

async function sendContactNotification({ name, email, message, createdAt }) {
  const subject = 'New Portfolio Contact Message — ' + name;
  const { text, html } = buildMail({ name, email, message, subject, createdAt });
  const transporter = getTransporter();
  const fromName = (process.env.EMAIL_FROM_NAME || 'Portfolio Contact').trim();
  const to = process.env.CONTACT_RECEIVER || 'vinitniwalkar804@gmail.com';
  return transporter.sendMail({
    from: `"${fromName.replace(/"/g, "'")}" <${process.env.EMAIL_USER}>`,
    to,
    replyTo: email,
    subject,
    text,
    html
  });
}

module.exports = { sendContactNotification };