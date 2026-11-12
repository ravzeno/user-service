import { ApiProperty } from "@nestjs/swagger";

export class GroupResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: String, nullable: true }) description!: string | null;
  @ApiProperty() active!: boolean;
  @ApiProperty() isSystem!: boolean;
  @ApiProperty({ type: String, format: "date-time", nullable: true })
  deletedAt!: Date | null;
  @ApiProperty() createdBy!: string;
  @ApiProperty() updatedBy!: string;
  @ApiProperty({ type: String, format: "date-time" }) createdAt!: Date;
  @ApiProperty({ type: String, format: "date-time" }) updatedAt!: Date;
}

export class GroupCountDto {
  @ApiProperty({ type: Number }) users!: number;
}

export class GroupListCountDto extends GroupCountDto {
  @ApiProperty({ type: Number }) permissions!: number;
}

export class GroupListItemDto extends GroupResponseDto {
  @ApiProperty({ type: () => GroupListCountDto }) _count!: GroupListCountDto;
}

export class GroupPermissionResponseDto {
  @ApiProperty() groupId!: string;
  @ApiProperty() permission!: string;
}

export class GroupDetailResponseDto extends GroupResponseDto {
  @ApiProperty({ type: () => [GroupPermissionResponseDto] })
  permissions!: GroupPermissionResponseDto[];
  @ApiProperty({ type: () => GroupCountDto }) _count!: GroupCountDto;
}

export class GroupMemberResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
  @ApiProperty() emailVerified!: boolean;
  @ApiProperty({ type: String, nullable: true }) image!: string | null;
  @ApiProperty({ type: String, nullable: true }) phoneNumber!: string | null;
  @ApiProperty() role!: string;
  @ApiProperty({ type: String, format: "date-time" }) createdAt!: Date;
}

export class GroupMembersResponseDto {
  @ApiProperty({ type: () => [GroupMemberResponseDto] })
  items!: GroupMemberResponseDto[];
  @ApiProperty({ type: Number }) page!: number;
  @ApiProperty({ type: Number }) limit!: number;
  @ApiProperty({ type: Number }) total!: number;
}

export class GroupDeletedResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: [true] }) deleted!: true;
}

export class GroupMemberAssignedResponseDto {
  @ApiProperty() groupId!: string;
  @ApiProperty() userId!: string;
  @ApiProperty({ enum: [true] }) assigned!: true;
}

export class GroupMemberRemovedResponseDto {
  @ApiProperty() groupId!: string;
  @ApiProperty() userId!: string;
  @ApiProperty({ enum: [true] }) removed!: true;
}
