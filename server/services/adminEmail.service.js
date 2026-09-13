const { getTransporter, isEmailConfigured } = require('../config/email');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function mailShell(title, heading, linesHtml, ctaLabel, ctaUrl) {
  return (
    '<div style="font-family:Segoe UI,Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;line-height:1.6">' +
    '<div style="background:linear-gradient(135deg,#6366f1,#22d3ee);border-radius:10px 10px 0 0;padding:20px 24px">' +
    '<h2 style="margin:0;color:#ffffff;font-size:18px">' + escapeHtml(heading) + '</h2>' +
    '</div>' +
    '<div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;padding:24px">' +
    '<p style="margin:0 0 16px">' + escapeHtml(title) + '</p>' +
    linesHtml +
    (ctaUrl
      ? '<p style="margin:20px 0 4px"><a href="' + escapeHtml(ctaUrl) + '" style="background:#6366f1;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;display:inline-block;font-weight:600">' + escapeHtml(ctaLabel || 'Continue') + '</a></p>' +
        '<p style="margin:14px 0 0;color:#6b7280;font-size:13px">If the button does not work, copy and paste this link into your browser:<br/><span style="word-break:break-all">' + escapeHtml(ctaUrl) + '</span></p>'
      : '') +
    '<p style="margin:24px 0 0;color:#6b7280;font-size:13px">If you did not request this, you can safely ignore this email.</p>' +
    '</div>' +
    '</div>'
  );
}

async function sendVerificationEmail({ to, verifyUrl }) {
  const html = mailShell(
    'Verify ownership of your admin account for the Vinit Niwalkar portfolio.',
    'Verify your Admin Email',
    '<p style="margin:0">Confirm this address to finish setting up your portfolio admin access.</p>',
    'Verify Email',
    verifyUrl
  );
  const text =
    'Verify your Admin Email\n\n' +
    'Confirm this address to finish setting up your portfolio admin access.\n\n' +
    verifyUrl;

  const transporter = getTransporter();
  return transporter.sendMail({
    from: `"Vinit Niwalkar Portfolio" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Verify your Admin Email - Vinit Niwalkar Portfolio',
    text,
    html
  });
}

async function sendResetEmail({ to, resetUrl }) {
  const html = mailShell(
    'Use the link below to set a new admin password. It expires in 60 minutes.',
    'Reset your Admin Password',
    '<p style="margin:0">A password reset was requested for your portfolio admin account.</p>',
    'Reset Password',
    resetUrl
  );
  const text =
    'Reset your Admin Password\n\n' +
    'A password reset was requested for your portfolio admin account.\n\n' +
    resetUrl;

  const transporter = getTransporter();
  return transporter.sendMail({
    from: `"Vinit Niwalkar Portfolio" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Reset your Admin Password - Vinit Niwalkar Portfolio',
    text,
    html
  });
}

module.exports = { sendVerificationEmail, sendResetEmail, isEmailConfigured };