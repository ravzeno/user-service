import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UserGroupSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
}

export class UserResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ format: "email" }) email!: string;
  @ApiProperty() emailVerified!: boolean;
  @ApiProperty({ type: String, nullable: true }) image!: string | null;
  @ApiProperty({ type: String, nullable: true }) phoneNumber!: string | null;
  @ApiProperty() role!: string;
  @ApiProperty() banned!: boolean;
  @ApiProperty({ type: String, nullable: true }) banReason!: string | null;
  @ApiProperty({ type: String, format: "date-time", nullable: true })
  banExpires!: Date | null;
  @ApiProperty({ type: String, format: "date-time", nullable: true })
  deletedAt!: Date | null;
  @ApiProperty({ type: String, format: "date-time" }) createdAt!: Date;
  @ApiProperty({ type: String, format: "date-time" }) updatedAt!: Date;
}

export class UserDetailResponseDto extends UserResponseDto {
  @ApiProperty({ type: () => [UserGroupSummaryDto] })
  groups!: UserGroupSummaryDto[];
}

export class UserUpdateResponseDto extends UserResponseDto {
  @ApiPropertyOptional({
    type: Boolean,
    description: "Present when the email was changed.",
  })
  emailVerificationSent?: boolean;
}

export class UserPageResponseDto {
  @ApiProperty({ type: () => [UserResponseDto] }) items!: UserResponseDto[];
  @ApiProperty({ type: Number }) page!: number;
  @ApiProperty({ type: Number }) limit!: number;
  @ApiProperty({ type: Number }) total!: number;
}

export class InternalUserResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ format: "email" }) email!: string;
  @ApiProperty() emailVerified!: boolean;
  @ApiProperty({ type: String, nullable: true }) phoneNumber!: string | null;
  @ApiProperty() role!: string;
  @ApiProperty({ type: String, format: "date-time" }) createdAt!: Date;
}

export class SessionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ type: String, format: "date-time" }) createdAt!: Date;
  @ApiProperty({ type: String, format: "date-time" }) updatedAt!: Date;
  @ApiProperty({ type: String, format: "date-time" }) expiresAt!: Date;
  @ApiProperty({ type: String, nullable: true }) ipAddress!: string | null;
  @ApiProperty({ type: String, nullable: true }) userAgent!: string | null;
}

export class DeletedUserResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: [true] }) deleted!: true;
}

export class RevokedSessionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: [true] }) revoked!: true;
}

export class UserHttpErrorDto {
  @ApiProperty({ type: Number }) statusCode!: number;
  @ApiProperty({
    oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
  })
  message!: string | string[];
  @ApiProperty() error!: string;
}

export class EffectivePermissionsResponseDto {
  @ApiProperty({
    type: [String],
    description: "Effective permission keys from active groups.",
  })
  permissions!: string[];
}
