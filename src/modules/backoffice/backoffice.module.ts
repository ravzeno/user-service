import { EffectivePermissionsService } from "../../common/guards/effective-permissions.service.js";
import { Module } from "@nestjs/common";
import { PermissionGuard } from "../../common/guards/permission.guard.js";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard.js";
import { UserModule } from "../user/user.module.js";
import { BackofficeUserController } from "./backoffice-user.backoffice.controller.js";

@Module({
  imports: [UserModule],
  controllers: [BackofficeUserController],
  providers: [PermissionGuard, EffectivePermissionsService, SessionAuthGuard],
})
export class BackofficeModule {}
