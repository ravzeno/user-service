import {
  Body,
  Controller,
  Get,
  Header,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { AvatarFile } from "./avatar-storage.service.js";
import type { Request } from "express";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
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

  @Post("avatar")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file"],
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ type: UserHttpErrorDto })
  uploadAvatar(
    @Req() request: Request & { authContext: { user: { id: string } } },
    @UploadedFile() file: AvatarFile | undefined,
  ) {
    return this.users.updateAvatar(request.authContext.user.id, file);
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
