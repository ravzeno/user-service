import { createApplication } from "./app.factory.js";
import { prisma } from "./prisma/prisma.client.js";

async function bootstrap() {
  const app = await createApplication();

  const port = Number(process.env.PORT || 3001);
  await app.listen(port);
  console.info("user-service listening on port " + port);
}

bootstrap().catch(async (error: unknown) => {
  console.error(error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
