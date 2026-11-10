import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator.js";
import { PermissionGuard } from "../../common/guards/permission.guard.js";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard.js";
import {
  CreateGroupDto,
  SetPermissionsDto,
  UpdateGroupDto,
} from "./dto/group.dto.js";
import { GroupsService } from "./groups.service.js";

@Controller("backoffice")
@UseGuards(SessionAuthGuard, PermissionGuard)
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get("groups")
  @RequirePermissions("core_group:list")
  listGroups() {
    return this.groups.list();
  }

  @Post("groups")
  @RequirePermissions("core_group:create")
  createGroup(
    @Body() dto: CreateGroupDto,
    @Req() req: Request & { authContext: { user: { id: string } } },
  ) {
    return this.groups.create(dto, req.authContext.user.id);
  }

  @Get("groups/:id")
  @RequirePermissions("core_group:view")
  getGroup(@Param("id") id: string) {
    return this.groups.get(id);
  }

  @Patch("groups/:id")
  @RequirePermissions("core_group:edit")
  updateGroup(
    @Param("id") id: string,
    @Body() dto: UpdateGroupDto,
    @Req() req: Request & { authContext: { user: { id: string } } },
  ) {
    return this.groups.update(id, dto, req.authContext.user.id);
  }

  @Delete("groups/:id")
  @RequirePermissions("core_group:delete")
  deleteGroup(
    @Param("id") id: string,
    @Req() req: Request & { authContext: { user: { id: string } } },
  ) {
    return this.groups.remove(id, req.authContext.user.id);
  }

  @Put("groups/:id/permissions")
  @RequirePermissions("core_group:assign_permissions")
  setPermissions(
    @Param("id") id: string,
    @Body() dto: SetPermissionsDto,
    @Req() req: Request & { authContext: { user: { id: string } } },
  ) {
    return this.groups.setPermissions(id, dto, req.authContext.user.id);
  }

  @Put("groups/:id/users/:userId")
  @RequirePermissions("core_group:assign_users")
  assignUser(
    @Param("id") groupId: string,
    @Param("userId") userId: string,
    @Req() req: Request & { authContext: { user: { id: string } } },
  ) {
    return this.groups.assignUser(groupId, userId, req.authContext.user.id);
  }

  @Delete("groups/:id/users/:userId")
  @RequirePermissions("core_group:remove_user")
  removeUser(
    @Param("id") groupId: string,
    @Param("userId") userId: string,
    @Req() req: Request & { authContext: { user: { id: string } } },
  ) {
    return this.groups.removeUser(groupId, userId, req.authContext.user.id);
  }

  @Delete("groups/:id/permissions/:permission")
  @RequirePermissions("core_group:remove_permission")
  async removePermission(
    @Param("id") id: string,
    @Param("permission") permission: string,
    @Req() req: Request & { authContext: { user: { id: string } } },
  ) {
    const group = await this.groups.get(id);
    const permissions = group.permissions
      .map((item) => item.permission)
      .filter((key) => key !== permission);
    return this.groups.setPermissions(
      id,
      { permissions } as SetPermissionsDto,
      req.authContext.user.id,
    );
  }
}
