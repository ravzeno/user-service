import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { PrismaClient } from "@prisma/client";
import type { Request } from "express";
import { REQUIRED_PERMISSIONS } from "../decorators/require-permissions.decorator.js";
import { PRISMA_CLIENT } from "../../prisma/prisma.client.js";
import type { PermissionKey } from "../../lib/permissions/app/core-permission.js";

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PermissionKey[]>(
      REQUIRED_PERMISSIONS,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { authContext?: { user: { id: string } } }>();
    const userId = request.authContext?.user.id;
    if (!userId)
      throw new ForbiddenException("Authenticated user context is missing");

    const memberships = await this.prisma.userGroup.findMany({
      where: { userId, group: { active: true, deletedAt: null } },
      select: {
        group: { select: { permissions: { select: { permission: true } } } },
      },
    });
    const actual = new Set(
      memberships.flatMap((m) => m.group.permissions.map((p) => p.permission)),
    );
    if (!required.every((permission) => actual.has(permission))) {
      throw new ForbiddenException("Insufficient permission");
    }
    return true;
  }
}
