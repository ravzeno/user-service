import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import type { PermissionKey } from "../../../lib/permissions/app/core-permission.js";

export class CreateGroupDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  slug!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class SetPermissionsDto {
  @IsArray()
  @IsString({ each: true })
  permissions!: PermissionKey[];
}
