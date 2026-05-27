import nodemailer from 'nodemailer';

function createTransport(smtpConfig) {
  return nodemailer.createTransport({
    host:   smtpConfig.host,
    port:   smtpConfig.port || 587,
    secure: smtpConfig.secure || false,
    auth:   { user: smtpConfig.user, pass: smtpConfig.pass },
  });
}

function platformTransport() {
  return createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user:   process.env.SMTP_USER,
    pass:   process.env.SMTP_PASS,
  });
}

export async function sendEmail({ institution, to, subject, html }) {
  let transport;
  let from;

  if (institution?.smtpHost && institution?.smtpUser) {
    transport = createTransport({
      host:   institution.smtpHost,
      port:   institution.smtpPort || 587,
      secure: false,
      user:   institution.smtpUser,
      pass:   institution.smtpPass,
    });
    from = `"${institution.emailFromName || institution.name}" <${institution.emailFromAddr || institution.smtpUser}>`;
  } else {
    transport = platformTransport();
    from = `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDR}>`;
  }

  const info = await transport.sendMail({ from, to, subject, html });
  return info;
}
