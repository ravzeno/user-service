import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { permissionCatalog } from "../../../lib/permissions/app/core-permission.js";
import type { PermissionKey } from "../../../lib/permissions/app/core-permission.js";

export class CreateGroupDto {
  @ApiProperty({ minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  slug!: string;

  @ApiProperty({ minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ type: String, maxLength: 500, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateGroupDto {
  @ApiPropertyOptional({
    type: String,
    maxLength: 100,
    description:
      "Omit to leave unchanged. A null value passes validation but cannot be persisted.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ type: String, maxLength: 500, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description:
      "Omit to leave unchanged. A null value passes validation but cannot be persisted.",
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class SetPermissionsDto {
  @ApiProperty({ type: [String], enum: permissionCatalog })
  @IsArray()
  @IsString({ each: true })
  permissions!: PermissionKey[];
}

export class GroupMembersQueryDto {
  @ApiPropertyOptional({ type: "integer", minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    type: "integer",
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
