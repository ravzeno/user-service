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
  purpose: "verification" | "password-reset",
  url: string,
): Promise<void> {
  if (!transport) {
    throw new Error("SMTP_HOST must be configured to send authentication email");
  }
  if (!process.env.SMTP_FROM) {
    throw new Error("SMTP_FROM must be configured to send authentication email");
  }

  const verification = purpose === "verification";
  const subject = verification ? "ยืนยันอีเมลของคุณ" : "ตั้งรหัสผ่านใหม่";
  const description = verification
    ? "ขอบคุณที่สมัครใช้งาน กรุณายืนยันอีเมลของคุณเพื่อเริ่มต้นใช้งานบัญชี"
    : "เราได้รับคำขอตั้งรหัสผ่านใหม่ กดปุ่มด้านล่างเพื่อดำเนินการต่อ";
  const button = verification ? "ยืนยันอีเมล" : "ตั้งรหัสผ่านใหม่";
  const safeUrl = url.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);

  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text: `${subject}\n\n${description}\n\n${button}: ${url}\n\nหากคุณไม่ได้ทำรายการนี้ สามารถเพิกเฉยต่ออีเมลฉบับนี้ได้`,
    html: `<!doctype html>
<html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f1f3f2;font-family:Arial,Tahoma,sans-serif;color:#202d2b;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;overflow:hidden;opacity:0;">${description}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f3f2;"><tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;">
<tr><td style="height:6px;background:#285a51;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:40px 36px 34px;">
<p style="margin:0 0 38px;color:#285a51;font-size:14px;font-weight:bold;letter-spacing:0.5px;">User Service</p>
<p style="margin:0 0 12px;color:#7a8984;font-size:11px;font-weight:bold;letter-spacing:1.5px;">${verification ? "EMAIL VERIFICATION" : "PASSWORD RESET"}</p>
<h1 style="margin:0 0 18px;color:#202d2b;font-size:26px;line-height:1.5;">${subject}</h1>
<p style="margin:0 0 28px;color:#53635f;font-size:15px;line-height:1.9;">${description}</p>
<table role="presentation" cellspacing="0" cellpadding="0"><tr><td bgcolor="#285a51" style="border-radius:4px;"><a href="${safeUrl}" style="display:inline-block;padding:14px 24px;color:#fff;font-size:15px;font-weight:bold;text-decoration:none;">${button}</a></td></tr></table>
<p style="margin:36px 0 8px;padding-top:24px;border-top:1px solid #e5ebe8;color:#7a8984;font-size:12px;line-height:1.8;">หากกดปุ่มไม่ได้ ให้คัดลอกลิงก์นี้ไปเปิดในเบราว์เซอร์</p>
<p style="margin:0;font-size:12px;line-height:1.7;word-break:break-all;"><a href="${safeUrl}" style="color:#285a51;">${safeUrl}</a></p>
</td></tr>
<tr><td style="padding:22px 36px;background:#f8faf9;border-top:1px solid #e5ebe8;color:#75827e;font-size:12px;line-height:1.8;">หากคุณไม่ได้ทำรายการนี้ สามารถเพิกเฉยต่ออีเมลฉบับนี้ได้<br>อีเมลนี้ส่งโดยอัตโนมัติจาก User Service</td></tr>
</table></td></tr></table></body></html>`,
  });
}
