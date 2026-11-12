import { Controller, Get, Inject, Query, UseGuards } from "@nestjs/common";
import type { PrismaClient } from "@prisma/client";
import {
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiQuery,
  ApiSecurity,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { RequirePermission } from "../../common/decorators/require-permissions.decorator.js";
import { PermissionGuard } from "../../common/guards/permission.guard.js";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard.js";
import { PRISMA_CLIENT } from "../../prisma/prisma.client.js";
import { httpErrorSchema } from "../../common/openapi-error.js";

@Controller("backoffice/audit-logs")
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
export class AuditLogBackofficeController {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  @Get()
  @ApiQuery({
    name: "page",
    required: false,
    type: String,
    description: "Numeric string; defaults to 1 and is clamped to at least 1.",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: String,
    description: "Numeric string; defaults to 50 and is clamped to 1–100.",
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      required: ["items", "page", "limit", "total"],
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            required: [
              "id",
              "actorId",
              "action",
              "targetId",
              "metadata",
              "ipAddress",
              "createdAt",
              "actor",
            ],
            properties: {
              id: { type: "string" },
              actorId: { type: "string", nullable: true },
              action: { type: "string" },
              targetId: { type: "string", nullable: true },
              metadata: {
                description: "Any JSON value",
                oneOf: [
                  {
                    type: "object",
                    additionalProperties: true,
                    nullable: true,
                  },
                  { type: "array", items: {} },
                  { type: "string" },
                  { type: "number" },
                  { type: "boolean" },
                ],
              },
              ipAddress: { type: "string", nullable: true },
              createdAt: { type: "string", format: "date-time" },
              actor: {
                type: "object",
                nullable: true,
                required: ["id", "name", "email"],
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  email: { type: "string" },
                },
              },
            },
          },
        },
        page: { type: "integer" },
        limit: { type: "integer" },
        total: { type: "integer" },
      },
    },
  })
  @RequirePermission("core_audit_log:list")
  async list(@Query("page") page = "1", @Query("limit") limit = "50") {
    const parsedPage = Math.trunc(Number(page) || 1);
    const parsedLimit = Math.trunc(Number(limit) || 50);
    const currentPage = Number.isSafeInteger(parsedPage)
      ? Math.max(1, parsedPage)
      : 1;
    const pageSize = Number.isSafeInteger(parsedLimit)
      ? Math.min(100, Math.max(1, parsedLimit))
      : 50;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        include: { actor: { select: { id: true, name: true, email: true } } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (currentPage - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count(),
    ]);
    return { items, page: currentPage, limit: pageSize, total };
  }
}
