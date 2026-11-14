import { EffectivePermissionsService } from "../../common/guards/effective-permissions.service.js";
import { Module } from "@nestjs/common";
import { PermissionGuard } from "../../common/guards/permission.guard.js";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard.js";
import { PermissionBackofficeController } from "./permission.backoffice.controller.js";
import { PermissionInternalController } from "./permission.internal.controller.js";
import { InternalApiKeyGuard } from "../../common/guards/internal-api-key.guard.js";

@Module({
  controllers: [PermissionBackofficeController, PermissionInternalController],
  providers: [
    PermissionGuard,
    EffectivePermissionsService,
    SessionAuthGuard,
    InternalApiKeyGuard,
  ],
})
export class PermissionModule {}
