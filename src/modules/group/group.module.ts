import { EffectivePermissionsService } from "../../common/guards/effective-permissions.service.js";
import { Module } from "@nestjs/common";
import { GroupsController } from "./groups.controller.js";
import { GroupsService } from "./groups.service.js";
import { PermissionGuard } from "../../common/guards/permission.guard.js";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard.js";

@Module({
  controllers: [GroupsController],
  providers: [
    GroupsService,
    PermissionGuard,
    EffectivePermissionsService,
    SessionAuthGuard,
  ],
})
export class GroupModule {}
