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
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiQuery,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { InternalApiKeyGuard } from "../../common/guards/internal-api-key.guard.js";
import { PRISMA_CLIENT } from "../../prisma/prisma.client.js";
import {
  InternalUserResponseDto,
  UserHttpErrorDto,
} from "./dto/user-response.dto.js";

const internalUserSelect = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  phoneNumber: true,
  role: true,
  createdAt: true,
} as const;

@ApiTags("Internal users")
@ApiSecurity("internalApiKey")
@ApiUnauthorizedResponse({ type: UserHttpErrorDto })
@Controller("internal/users")
@UseGuards(InternalApiKeyGuard)
export class UserInternalController {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  @Get()
  @ApiOkResponse({ type: InternalUserResponseDto, isArray: true })
  @ApiQuery({ name: "q", required: false, type: String })
  @ApiQuery({ name: "email", required: false, type: String })
  @ApiQuery({ name: "phoneNumber", required: false, type: String })
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
  @ApiOkResponse({ type: InternalUserResponseDto })
  @ApiNotFoundResponse({ type: UserHttpErrorDto })
  async byEmail(@Param("email") email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
      select: internalUserSelect,
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  @Get(":id")
  @ApiOkResponse({ type: InternalUserResponseDto })
  @ApiNotFoundResponse({ type: UserHttpErrorDto })
  async get(@Param("id") id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: internalUserSelect,
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }
}
