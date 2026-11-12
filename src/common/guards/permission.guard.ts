import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import {
  REQUIRED_PERMISSIONS,
  type RequiredPermissions,
} from "../decorators/require-permissions.decorator.js";
import { EffectivePermissionsService } from "./effective-permissions.service.js";

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: EffectivePermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<RequiredPermissions>(
      REQUIRED_PERMISSIONS,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const request = context
      .switchToHttp()
      .getRequest<
        Request & { authContext?: { user: { id: string; role: string } } }
      >();
    const userId = request.authContext?.user.id;
    if (!userId)
      throw new ForbiddenException("Authenticated user context is missing");

    const actual = new Set(
      await this.permissions.forUser(request.authContext!.user),
    );
    const hasAccess =
      required.permissions.length > 0 &&
      (required.mode === "all"
        ? required.permissions.every((permission) => actual.has(permission))
        : required.permissions.some((permission) => actual.has(permission)));
    if (!hasAccess) {
      throw new ForbiddenException("Insufficient permission");
    }
    return true;
  }
}
