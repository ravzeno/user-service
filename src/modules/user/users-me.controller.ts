import {
  Body,
  Controller,
  Get,
  Header,
  Patch,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { EffectivePermissionsService } from "../../common/guards/effective-permissions.service.js";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard.js";
import { UpdateMyProfileDto } from "./dto/user.dto.js";
import { UsersService } from "./users.service.js";
import {
  EffectivePermissionsResponseDto,
  UserDetailResponseDto,
  UserHttpErrorDto,
  UserResponseDto,
} from "./dto/user-response.dto.js";

@ApiTags("Profile")
@ApiSecurity("session")
@ApiUnauthorizedResponse({ type: UserHttpErrorDto })
@ApiNotFoundResponse({ type: UserHttpErrorDto })
@Controller("me")
@UseGuards(SessionAuthGuard)
export class UsersMeController {
  constructor(
    private readonly users: UsersService,
    private readonly permissions: EffectivePermissionsService,
  ) {}

  @Get()
  @ApiOkResponse({ type: UserDetailResponseDto })
  getMe(@Req() request: Request & { authContext: { user: { id: string } } }) {
    return this.users.me(request.authContext.user.id);
  }

  @Get("permissions")
  @Header("Cache-Control", "no-store")
  @ApiOkResponse({ type: EffectivePermissionsResponseDto })
  async getPermissions(
    @Req()
    request: Request & { authContext: { user: { id: string; role: string } } },
  ) {
    return {
      permissions: await this.permissions.forUser(request.authContext.user),
    };
  }

  @Patch()
  @ApiOkResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ type: UserHttpErrorDto })
  updateMe(
    @Req() request: Request & { authContext: { user: { id: string } } },
    @Body() dto: UpdateMyProfileDto,
  ) {
    return this.users.update(
      request.authContext.user.id,
      { name: dto.name, phoneNumber: dto.phoneNumber },
      request.authContext.user.id,
    );
  }
}
