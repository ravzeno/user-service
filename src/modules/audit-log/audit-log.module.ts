import { Module } from "@nestjs/common";
import { AuditLogBackofficeController } from "./audit-log.backoffice.controller.js";
import { PermissionGuard } from "../../common/guards/permission.guard.js";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard.js";

@Module({
  controllers: [AuditLogBackofficeController],
  providers: [PermissionGuard, SessionAuthGuard],
})
export class AuditLogModule {}
