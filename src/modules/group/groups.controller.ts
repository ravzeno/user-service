import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import {
  ApiBody,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";
import { RequirePermission } from "../../common/decorators/require-permissions.decorator.js";
import { PermissionGuard } from "../../common/guards/permission.guard.js";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard.js";
import {
  CreateGroupDto,
  GroupMembersQueryDto,
  SetPermissionsDto,
  UpdateGroupDto,
} from "./dto/group.dto.js";
import { GroupsService } from "./groups.service.js";
import {
  GroupDeletedResponseDto,
  GroupDetailResponseDto,
  GroupListItemDto,
  GroupMemberAssignedResponseDto,
  GroupMemberRemovedResponseDto,
  GroupMembersResponseDto,
  GroupResponseDto,
} from "./dto/group-response.dto.js";

const apiError = (status: number) =>
  ApiResponse({
    status,
    description: `HTTP ${status} error`,
    schema: {
      type: "object",
      required: ["statusCode", "message"],
      properties: {
        statusCode: { type: "integer", example: status },
        message: {
          oneOf: [
            { type: "string" },
            { type: "array", items: { type: "string" } },
          ],
        },
        error: { type: "string" },
      },
    },
  });

@ApiTags("Groups")
@ApiSecurity("session")
@apiError(401)
@apiError(403)
@Controller("backoffice")
@UseGuards(SessionAuthGuard, PermissionGuard)
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get("groups")
  @ApiResponse({ status: 200, type: GroupListItemDto, isArray: true })
  @RequirePermission("core_group:list")
  listGroups() {
    return this.groups.list();
  }

  @Post("groups")
  @ApiBody({ type: CreateGroupDto })
  @ApiResponse({ status: 201, type: GroupResponseDto })
  @apiError(400)
  @apiError(409)
  @RequirePermission("core_group:create")
  createGroup(
    @Body() dto: CreateGroupDto,
    @Req() req: Request & { authContext: { user: { id: string } } },
  ) {
    return this.groups.create(dto, req.authContext.user.id);
  }

  @Get("groups/:id")
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, type: GroupDetailResponseDto })
  @apiError(404)
  @RequirePermission("core_group:view")
  getGroup(@Param("id") id: string) {
    return this.groups.get(id);
  }

  @Get("groups/:id/users")
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, type: GroupMembersResponseDto })
  @apiError(400)
  @apiError(404)
  @RequirePermission("core_group:view")
  listGroupUsers(
    @Param("id") id: string,
    @Query() query: GroupMembersQueryDto,
  ) {
    return this.groups.listMembers(id, query.page, query.limit);
  }

  @Patch("groups/:id")
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateGroupDto })
  @ApiResponse({ status: 200, type: GroupResponseDto })
  @apiError(400)
  @apiError(404)
  @RequirePermission("core_group:edit")
  updateGroup(
    @Param("id") id: string,
    @Body() dto: UpdateGroupDto,
    @Req() req: Request & { authContext: { user: { id: string } } },
  ) {
    return this.groups.update(id, dto, req.authContext.user.id);
  }

  @Delete("groups/:id")
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, type: GroupDeletedResponseDto })
  @apiError(400)
  @apiError(404)
  @RequirePermission("core_group:delete")
  deleteGroup(
    @Param("id") id: string,
    @Req() req: Request & { authContext: { user: { id: string } } },
  ) {
    return this.groups.remove(id, req.authContext.user.id);
  }

  @Put("groups/:id/permissions")
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: SetPermissionsDto })
  @ApiResponse({ status: 200, type: GroupDetailResponseDto })
  @apiError(400)
  @apiError(404)
  @RequirePermission("core_group:assign_permissions")
  setPermissions(
    @Param("id") id: string,
    @Body() dto: SetPermissionsDto,
    @Req() req: Request & { authContext: { user: { id: string } } },
  ) {
    return this.groups.setPermissions(id, dto, req.authContext.user.id);
  }

  @Put("groups/:id/users/:userId")
  @ApiParam({ name: "id", type: String })
  @ApiParam({ name: "userId", type: String })
  @ApiResponse({ status: 200, type: GroupMemberAssignedResponseDto })
  @apiError(400)
  @apiError(404)
  @RequirePermission("core_group:assign_users")
  assignUser(
    @Param("id") groupId: string,
    @Param("userId") userId: string,
    @Req() req: Request & { authContext: { user: { id: string } } },
  ) {
    return this.groups.assignUser(groupId, userId, req.authContext.user.id);
  }

  @Delete("groups/:id/users/:userId")
  @ApiParam({ name: "id", type: String })
  @ApiParam({ name: "userId", type: String })
  @ApiResponse({ status: 200, type: GroupMemberRemovedResponseDto })
  @apiError(400)
  @apiError(404)
  @RequirePermission("core_group:remove_user")
  removeUser(
    @Param("id") groupId: string,
    @Param("userId") userId: string,
    @Req() req: Request & { authContext: { user: { id: string } } },
  ) {
    return this.groups.removeUser(groupId, userId, req.authContext.user.id);
  }

  @Delete("groups/:id/permissions/:permission")
  @ApiParam({ name: "id", type: String })
  @ApiParam({ name: "permission", type: String })
  @ApiResponse({ status: 200, type: GroupDetailResponseDto })
  @apiError(400)
  @apiError(404)
  @RequirePermission("core_group:remove_permission")
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
