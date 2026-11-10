import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { PrismaClient } from "@prisma/client";
import type { Request } from "express";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator.js";
import { PermissionGuard } from "../../common/guards/permission.guard.js";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard.js";
import { PRISMA_CLIENT } from "../../prisma/prisma.client.js";
import {
  BanUserDto,
  CreateUserDto,
  ListUsersQueryDto,
  UpdateRoleDto,
  UpdateUserDto,
} from "../user/dto/user.dto.js";
import { UsersService } from "../user/users.service.js";

@Controller("backoffice/users")
@UseGuards(SessionAuthGuard, PermissionGuard)
export class BackofficeUserController {
  constructor(
    private readonly users: UsersService,
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
  ) {}

  @Get()
  @RequirePermissions("core_user:list")
  list(@Query() query: ListUsersQueryDto) {
    return this.users.list(query.q, query.page, query.limit);
  }

  @Post()
  @RequirePermissions("core_user:create")
  create(
    @Body() dto: CreateUserDto,
    @Req() request: Request & { authContext: { user: { id: string } } },
  ) {
    return this.users.create(dto, request.authContext.user.id);
  }

  @Get(":id")
  @RequirePermissions("core_user:get")
  get(@Param("id") id: string) {
    return this.users.get(id);
  }

  @Patch(":id")
  @RequirePermissions("core_user:update")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
    @Req() request: Request & { authContext: { user: { id: string } } },
  ) {
    return this.users.update(id, dto, request.authContext.user.id);
  }

  @Patch(":id/role")
  @RequirePermissions("core_user:set-role")
  setRole(
    @Param("id") id: string,
    @Body() dto: UpdateRoleDto,
    @Req() request: Request & { authContext: { user: { id: string } } },
  ) {
    return this.users.setRole(id, dto, request.authContext.user.id);
  }

  @Post(":id/ban")
  @RequirePermissions("core_user:ban")
  ban(
    @Param("id") id: string,
    @Body() dto: BanUserDto,
    @Req() request: Request & { authContext: { user: { id: string } } },
  ) {
    return this.users.setBanned(
      id,
      true,
      dto.reason,
      request.authContext.user.id,
    );
  }

  @Delete(":id/ban")
  @RequirePermissions("core_user:ban")
  unban(
    @Param("id") id: string,
    @Req() request: Request & { authContext: { user: { id: string } } },
  ) {
    return this.users.setBanned(
      id,
      false,
      undefined,
      request.authContext.user.id,
    );
  }

  @Delete(":id")
  @RequirePermissions("core_user:delete")
  delete(
    @Param("id") id: string,
    @Req() request: Request & { authContext: { user: { id: string } } },
  ) {
    return this.users.softDelete(id, request.authContext.user.id);
  }

  @Get(":id/sessions")
  @RequirePermissions("core_session:list")
  listSessions(@Param("id") id: string) {
    return this.users.listSessions(id);
  }

  @Delete(":id/sessions/:sessionId")
  @RequirePermissions("core_session:revoke")
  revokeSession(
    @Param("id") id: string,
    @Param("sessionId") sessionId: string,
    @Req() request: Request & { authContext: { user: { id: string } } },
  ) {
    return this.users.revokeSession(id, sessionId, request.authContext.user.id);
  }

  @Get(":id/groups")
  @RequirePermissions("core_user:get")
  groups(@Param("id") id: string) {
    return this.prisma.userGroup
      .findMany({
        where: { userId: id, group: { deletedAt: null } },
        select: { group: { select: { id: true, slug: true, name: true } } },
      })
      .then((items) => items.map((item) => item.group));
  }
}
