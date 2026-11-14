import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Query,
  UseGuards,
} from "@nestjs/common";
import type { PrismaClient } from "@prisma/client";
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiQuery,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { InternalApiKeyGuard } from "../../common/guards/internal-api-key.guard.js";
import { httpErrorSchema } from "../../common/openapi-error.js";
import { PRISMA_CLIENT } from "../../prisma/prisma.client.js";

@ApiTags("Internal permissions")
@ApiSecurity("internalApiKey")
@ApiUnauthorizedResponse({ schema: httpErrorSchema })
@Controller("internal/permissions")
@UseGuards(InternalApiKeyGuard)
export class PermissionInternalController {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  @Get()
  @ApiQuery({ name: "appName", required: false, enum: ["core", "dropper"] })
  @ApiBadRequestResponse({
    description: "Invalid appName",
    schema: httpErrorSchema,
  })
  @ApiOkResponse({
    schema: {
      type: "array",
      items: {
        type: "object",
        required: ["key", "label", "appName"],
        properties: {
          key: { type: "string" },
          label: { type: "string" },
          appName: { type: "string" },
        },
      },
    },
  })
  list(@Query("appName") appName?: string) {
    if (appName !== undefined && appName !== "core" && appName !== "dropper") {
      throw new BadRequestException("appName must be core or dropper");
    }
    return this.prisma.permission.findMany({
      where: appName === undefined ? {} : { appName },
      select: { key: true, label: true, appName: true },
      orderBy: [{ appName: "asc" }, { key: "asc" }],
    });
  }
}
