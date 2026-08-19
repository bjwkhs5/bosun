import { Resend } from "resend";

export function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY in .env.local");
  }
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendOutreachEmail(opts: {
  to: string;
  subject: string;
  text: string;
}) {
  const resend = getResend();
  const from = process.env.RESEND_FROM_EMAIL || "Bosun <onboarding@resend.dev>";
  const replyTo = process.env.EMAIL_USER;

  const { error } = await resend.emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    ...(replyTo ? { replyTo } : {}),
  });

  if (error) {
    throw new Error(error.message);
  }
}
