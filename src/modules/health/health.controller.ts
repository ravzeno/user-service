import { Controller, Get, Inject } from "@nestjs/common";
import type { PrismaClient } from "@prisma/client";
import { ApiOkResponse } from "@nestjs/swagger";
import { PRISMA_CLIENT } from "../../prisma/prisma.client.js";

@Controller("health")
export class HealthController {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  @Get()
  @ApiOkResponse({
    schema: {
      type: "object",
      required: ["status", "service"],
      properties: {
        status: { type: "string", enum: ["ok"] },
        service: { type: "string", enum: ["user-service"] },
      },
    },
  })
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: "ok", service: "user-service" };
  }
}
