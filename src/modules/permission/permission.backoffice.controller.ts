import { Controller, Get, UseGuards } from "@nestjs/common";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator.js";
import { PermissionGuard } from "../../common/guards/permission.guard.js";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard.js";
import { permissionCatalog } from "../../lib/permissions/app/core-permission.js";

@Controller("backoffice/permissions")
@UseGuards(SessionAuthGuard, PermissionGuard)
export class PermissionBackofficeController {
  @Get()
  @RequirePermissions("core_permission:list")
  list() {
    return permissionCatalog;
  }
}
