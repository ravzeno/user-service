import { Body, Controller, Get, Patch, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard.js";
import { UpdateMyProfileDto } from "./dto/user.dto.js";
import { UsersService } from "./users.service.js";
import {
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
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOkResponse({ type: UserDetailResponseDto })
  getMe(@Req() request: Request & { authContext: { user: { id: string } } }) {
    return this.users.me(request.authContext.user.id);
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
