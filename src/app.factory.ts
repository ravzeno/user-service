import "dotenv/config";
import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { toNodeHandler } from "better-auth/node";
import type { Request, Response, NextFunction } from "express";
import { setupApiDocs, setupBetterAuthDocs } from "./api-docs.js";
import { AppModule } from "./app.module.js";
import { auth } from "./lib/auth.js";

export async function createApplication() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const trustedOrigins = (
    process.env.TRUSTED_ORIGINS || "http://localhost:3000,http://localhost:3001"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: trustedOrigins, credentials: true });
  app.setGlobalPrefix("api");
  if (process.env.ENABLE_API_DOCS === "true") {
    await setupApiDocs(app);
    await setupBetterAuthDocs(app);
  }
  app.use("/api/email-verification-result", (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET" || req.path !== "/") return next();
    const failed = typeof req.query.error === "string";
    res.set("Cache-Control", "no-store").type("html").send(`<!doctype html>
<html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ยืนยันอีเมล</title></head>
<body style="font-family:system-ui,sans-serif;max-width:36rem;margin:5rem auto;padding:0 1.5rem;line-height:1.6">
<h1>${failed ? "ยืนยันอีเมลไม่สำเร็จ" : "ยืนยันอีเมลสำเร็จ"}</h1>
<p>${failed ? "ลิงก์อาจหมดอายุหรือไม่ถูกต้อง กรุณาขอลิงก์ยืนยันใหม่" : "คุณสามารถกลับไปเข้าสู่ระบบได้แล้ว"}</p>
</body></html>`);
  });
  app.use("/api/auth", toNodeHandler(auth));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.enableShutdownHooks();
  return app;
}
