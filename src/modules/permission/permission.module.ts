import { EffectivePermissionsService } from "../../common/guards/effective-permissions.service.js";
import { Module } from "@nestjs/common";
import { PermissionGuard } from "../../common/guards/permission.guard.js";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard.js";
import { PermissionBackofficeController } from "./permission.backoffice.controller.js";

@Module({
  controllers: [PermissionBackofficeController],
  providers: [PermissionGuard, EffectivePermissionsService, SessionAuthGuard],
})
export class PermissionModule {}
