import {
  Global,
  Injectable,
  Module,
  type OnApplicationShutdown,
} from "@nestjs/common";
import { PRISMA_CLIENT, prisma } from "./prisma.client.js";

@Injectable()
class PrismaShutdownService implements OnApplicationShutdown {
  async onApplicationShutdown() {
    await prisma.$disconnect();
  }
}

@Global()
@Module({
  providers: [
    { provide: PRISMA_CLIENT, useValue: prisma },
    PrismaShutdownService,
  ],
  exports: [PRISMA_CLIENT],
})
export class PrismaModule {}
