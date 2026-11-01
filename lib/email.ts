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
  attachments?: { filename: string; content: Buffer }[];
  replyTo?: string | null;
}) {
  const resend = getResend();
  // TODO: RESEND_FROM_EMAIL (the `from` address) is still global across all
  // users — Resend requires a verified sending domain, so a real per-user
  // `from` isn't practical yet. Reply-to is per-user (below); from isn't.
  const from = process.env.RESEND_FROM_EMAIL || "Bosun <onboarding@resend.dev>";
  const replyTo = opts.replyTo || process.env.EMAIL_USER;

  const { error } = await resend.emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    ...(replyTo ? { replyTo } : {}),
    ...(opts.attachments?.length ? { attachments: opts.attachments } : {}),
  });

  if (error) {
    throw new Error(error.message);
  }
}
