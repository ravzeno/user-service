import { Module } from "@nestjs/common";
import { InternalApiKeyGuard } from "../../common/guards/internal-api-key.guard.js";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard.js";
import { PermissionGuard } from "../../common/guards/permission.guard.js";
import { UserInternalController } from "./user.internal.controller.js";
import { UsersMeController } from "./users-me.controller.js";
import { UsersService } from "./users.service.js";

@Module({
  controllers: [UsersMeController, UserInternalController],
  providers: [
    UsersService,
    SessionAuthGuard,
    PermissionGuard,
    InternalApiKeyGuard,
  ],
  exports: [UsersService],
})
export class UserModule {}
