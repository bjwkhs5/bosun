import nodemailer from "nodemailer";

export function getEmailTransport() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error(
      "Email isn't configured — set EMAIL_USER and EMAIL_APP_PASSWORD in .env.local"
    );
  }
  return nodemailer.createTransport({
    host: "smtp-mail.outlook.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user, pass },
  });
}

export async function sendOutreachEmail(opts: {
  to: string;
  subject: string;
  text: string;
}) {
  const transport = getEmailTransport();
  await transport.sendMail({
    from: process.env.EMAIL_USER,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
  });
}
