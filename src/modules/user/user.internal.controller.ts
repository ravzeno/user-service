import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import type { PrismaClient } from "@prisma/client";
import { InternalApiKeyGuard } from "../../common/guards/internal-api-key.guard.js";
import { PRISMA_CLIENT } from "../../prisma/prisma.client.js";

const internalUserSelect = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  phoneNumber: true,
  role: true,
  createdAt: true,
} as const;

@Controller("internal/users")
@UseGuards(InternalApiKeyGuard)
export class UserInternalController {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  @Get()
  async search(
    @Query("q") q?: string,
    @Query("email") email?: string,
    @Query("phoneNumber") phoneNumber?: string,
  ) {
    const term = q?.trim();
    const where = {
      deletedAt: null,
      ...(email
        ? { email: { equals: email.trim(), mode: "insensitive" as const } }
        : {}),
      ...(phoneNumber ? { phoneNumber: phoneNumber.trim() } : {}),
      ...(term
        ? {
            OR: [
              { email: { contains: term, mode: "insensitive" as const } },
              { name: { contains: term, mode: "insensitive" as const } },
              { phoneNumber: { contains: term } },
            ],
          }
        : {}),
    };
    return this.prisma.user.findMany({
      where,
      select: internalUserSelect,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  @Get("by-email/:email")
  async byEmail(@Param("email") email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
      select: internalUserSelect,
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: internalUserSelect,
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }
}
