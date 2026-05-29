import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const DEFAULT_FROM = 'CANDOR <noreply@reforma.ng>';

export async function sendEmail({ institution, to, subject, html }) {
  const from = institution?.emailFromAddr
    ? `"${institution.emailFromName || institution.name}" <${institution.emailFromAddr}>`
    : DEFAULT_FROM;

  await resend.emails.send({ from, to, subject, html });
}
