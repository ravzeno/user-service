import "dotenv/config";
import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { toNodeHandler } from "better-auth/node";
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
