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
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
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
import {
  DeletedUserResponseDto,
  RevokedSessionResponseDto,
  SessionResponseDto,
  UserDetailResponseDto,
  UserGroupSummaryDto,
  UserHttpErrorDto,
  UserPageResponseDto,
  UserResponseDto,
  UserUpdateResponseDto,
} from "../user/dto/user-response.dto.js";

@ApiTags("Backoffice users")
@ApiSecurity("session")
@ApiUnauthorizedResponse({ type: UserHttpErrorDto })
@ApiForbiddenResponse({ type: UserHttpErrorDto })
@Controller("backoffice/users")
@UseGuards(SessionAuthGuard, PermissionGuard)
export class BackofficeUserController {
  constructor(
    private readonly users: UsersService,
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
  ) {}

  @Get()
  @ApiOkResponse({ type: UserPageResponseDto })
  @ApiBadRequestResponse({ type: UserHttpErrorDto })
  @RequirePermissions("core_user:list")
  list(@Query() query: ListUsersQueryDto) {
    return this.users.list(query.q, query.page, query.limit, query.scope);
  }

  @Post()
  @ApiCreatedResponse({ type: UserDetailResponseDto })
  @ApiBadRequestResponse({ type: UserHttpErrorDto })
  @ApiConflictResponse({ type: UserHttpErrorDto })
  @RequirePermissions("core_user:create")
  create(
    @Body() dto: CreateUserDto,
    @Req() request: Request & { authContext: { user: { id: string } } },
  ) {
    return this.users.create(dto, request.authContext.user.id);
  }

  @Get(":id")
  @ApiOkResponse({ type: UserDetailResponseDto })
  @ApiNotFoundResponse({ type: UserHttpErrorDto })
  @RequirePermissions("core_user:get")
  get(@Param("id") id: string) {
    return this.users.get(id);
  }

  @Patch(":id")
  @ApiOkResponse({ type: UserUpdateResponseDto })
  @ApiBadRequestResponse({ type: UserHttpErrorDto })
  @ApiNotFoundResponse({ type: UserHttpErrorDto })
  @ApiConflictResponse({ type: UserHttpErrorDto })
  @RequirePermissions("core_user:update")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
    @Req() request: Request & { authContext: { user: { id: string } } },
  ) {
    return this.users.update(id, dto, request.authContext.user.id);
  }

  @Patch(":id/role")
  @ApiOkResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ type: UserHttpErrorDto })
  @ApiNotFoundResponse({ type: UserHttpErrorDto })
  @RequirePermissions("core_user:set-role")
  setRole(
    @Param("id") id: string,
    @Body() dto: UpdateRoleDto,
    @Req() request: Request & { authContext: { user: { id: string } } },
  ) {
    return this.users.setRole(id, dto, request.authContext.user.id);
  }

  @Post(":id/ban")
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ type: UserHttpErrorDto })
  @ApiNotFoundResponse({ type: UserHttpErrorDto })
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
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ type: UserHttpErrorDto })
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
  @ApiOkResponse({ type: DeletedUserResponseDto })
  @ApiNotFoundResponse({ type: UserHttpErrorDto })
  @RequirePermissions("core_user:delete")
  delete(
    @Param("id") id: string,
    @Req() request: Request & { authContext: { user: { id: string } } },
  ) {
    return this.users.softDelete(id, request.authContext.user.id);
  }

  @Get(":id/sessions")
  @ApiOkResponse({ type: SessionResponseDto, isArray: true })
  @ApiNotFoundResponse({ type: UserHttpErrorDto })
  @RequirePermissions("core_session:list")
  listSessions(@Param("id") id: string) {
    return this.users.listSessions(id);
  }

  @Delete(":id/sessions/:sessionId")
  @ApiOkResponse({ type: RevokedSessionResponseDto })
  @ApiNotFoundResponse({ type: UserHttpErrorDto })
  @RequirePermissions("core_session:revoke")
  revokeSession(
    @Param("id") id: string,
    @Param("sessionId") sessionId: string,
    @Req() request: Request & { authContext: { user: { id: string } } },
  ) {
    return this.users.revokeSession(id, sessionId, request.authContext.user.id);
  }

  @Get(":id/groups")
  @ApiOkResponse({ type: UserGroupSummaryDto, isArray: true })
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
