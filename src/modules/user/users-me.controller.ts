import { Body, Controller, Get, Patch, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard.js";
import { UpdateMyProfileDto } from "./dto/user.dto.js";
import { UsersService } from "./users.service.js";

@Controller("me")
@UseGuards(SessionAuthGuard)
export class UsersMeController {
  constructor(private readonly users: UsersService) {}

  @Get()
  getMe(@Req() request: Request & { authContext: { user: { id: string } } }) {
    return this.users.me(request.authContext.user.id);
  }

  @Patch()
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
