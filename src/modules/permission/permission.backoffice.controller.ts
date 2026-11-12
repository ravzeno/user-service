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
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiQuery,
  ApiSecurity,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator.js";
import { PermissionGuard } from "../../common/guards/permission.guard.js";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard.js";
import { PRISMA_CLIENT } from "../../prisma/prisma.client.js";
import { httpErrorSchema } from "../../common/openapi-error.js";

@Controller("backoffice/permissions")
@ApiSecurity("session")
@ApiUnauthorizedResponse({
  description: "Authentication required or account unavailable",
  schema: httpErrorSchema,
})
@ApiForbiddenResponse({
  description: "Insufficient permission",
  schema: httpErrorSchema,
})
@UseGuards(SessionAuthGuard, PermissionGuard)
export class PermissionBackofficeController {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  @Get()
  @ApiQuery({ name: "appName", required: false, enum: ["core", "customer"] })
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
  @RequirePermissions("core_permission:list")
  list(@Query("appName") appName?: string) {
    if (appName !== undefined && appName !== "core" && appName !== "customer") {
      throw new BadRequestException("appName must be core or customer");
    }
    return this.prisma.permission.findMany({
      where: appName ? { appName } : undefined,
      select: { key: true, label: true, appName: true },
      orderBy: [{ appName: "asc" }, { key: "asc" }],
    });
  }
}
