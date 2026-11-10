import nodemailer from "nodemailer";

const transport = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    })
  : null;

export async function sendAuthEmail(
  to: string,
  subject: string,
  url: string,
): Promise<void> {
  if (!transport) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SMTP_HOST must be configured to send authentication email",
      );
    }
    console.info("[development auth email]", { to, subject, url });
    return;
  }

  await transport.sendMail({
    from: process.env.SMTP_FROM || "User Service <no-reply@example.com>",
    to,
    subject,
    text: subject + ": " + url,
    html: "<p>" + subject + '</p><p><a href="' + url + '">Continue</a></p>',
  });
}
