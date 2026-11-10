import "dotenv/config";
import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { toNodeHandler } from "better-auth/node";
import { AppModule } from "./app.module.js";
import { auth } from "./lib/auth.js";
import { prisma } from "./prisma/prisma.client.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const trustedOrigins = (
    process.env.TRUSTED_ORIGINS || "http://localhost:3000,http://localhost:3001"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({ origin: trustedOrigins, credentials: true });
  app.use("/api/auth", toNodeHandler(auth));
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.enableShutdownHooks();

  const port = Number(process.env.PORT || 3001);
  await app.listen(port);
  console.info("user-service listening on port " + port);
}

bootstrap().catch(async (error: unknown) => {
  console.error(error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
