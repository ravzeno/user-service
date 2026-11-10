import { Controller, Get, Inject, Query, UseGuards } from "@nestjs/common";
import type { PrismaClient } from "@prisma/client";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator.js";
import { PermissionGuard } from "../../common/guards/permission.guard.js";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard.js";
import { PRISMA_CLIENT } from "../../prisma/prisma.client.js";

@Controller("backoffice/audit-logs")
@UseGuards(SessionAuthGuard, PermissionGuard)
export class AuditLogBackofficeController {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  @Get()
  @RequirePermissions("core_audit_log:list")
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
