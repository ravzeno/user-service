import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
} from "@nestjs/common";
import { AuditLogModule } from "./modules/audit-log/audit-log.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { BackofficeModule } from "./modules/backoffice/backoffice.module.js";
import { GroupModule } from "./modules/group/group.module.js";
import { HealthModule } from "./modules/health/health.module.js";
import { PermissionModule } from "./modules/permission/permission.module.js";
import { UserModule } from "./modules/user/user.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { RawBodyMiddleware } from "./common/middlewares/raw-body.middleware.js";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    HealthModule,
    UserModule,
    BackofficeModule,
    GroupModule,
    PermissionModule,
    AuditLogModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RawBodyMiddleware).forRoutes("/");
  }
}
