import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, type PrismaClient } from "@prisma/client";
import {
  permissionCatalog,
  type PermissionKey,
} from "../../lib/permissions/app/core-permission.js";
import { PRISMA_CLIENT } from "../../prisma/prisma.client.js";
import type {
  CreateGroupDto,
  SetPermissionsDto,
  UpdateGroupDto,
} from "./dto/group.dto.js";

@Injectable()
export class GroupsService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  list() {
    return this.prisma.group.findMany({
      where: { deletedAt: null },
      include: { _count: { select: { users: true, permissions: true } } },
      orderBy: { name: "asc" },
    });
  }

  async get(id: string) {
    const group = await this.prisma.group.findFirst({
      where: { id, deletedAt: null },
      include: {
        permissions: { orderBy: { permission: "asc" } },
        _count: { select: { users: true } },
      },
    });
    if (!group) throw new NotFoundException("Group not found");
    return group;
  }

  async create(dto: CreateGroupDto, actorId: string) {
    try {
      const group = await this.prisma.group.create({
        data: { ...dto, createdBy: actorId, updatedBy: actorId },
      });
      await this.audit(actorId, "group.create", group.id, { slug: group.slug });
      return group;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Group slug already exists");
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateGroupDto, actorId: string) {
    const existing = await this.get(id);
    if (existing.isSystem && dto.active === false)
      throw new BadRequestException("System groups cannot be deactivated");
    const group = await this.prisma.group.update({
      where: { id },
      data: { ...dto, updatedBy: actorId },
    });
    await this.audit(actorId, "group.update", id, {
      changedFields: Object.keys(dto),
    });
    return group;
  }

  async remove(id: string, actorId: string) {
    const existing = await this.get(id);
    if (existing.isSystem)
      throw new BadRequestException("System groups cannot be deleted");
    await this.prisma.group.update({
      where: { id },
      data: { deletedAt: new Date(), active: false, updatedBy: actorId },
    });
    await this.audit(actorId, "group.soft-delete", id);
    return { id, deleted: true };
  }

  async setPermissions(id: string, dto: SetPermissionsDto, actorId: string) {
    const group = await this.get(id);
    if (group.isSystem && group.slug === "root-admin")
      throw new BadRequestException("Root administrator permissions are fixed");
    const requested = [...new Set(dto.permissions)];
    const invalid = requested.filter(
      (permission) => !permissionCatalog.includes(permission as PermissionKey),
    );
    if (invalid.length)
      throw new BadRequestException(
        "Unknown permission: " + invalid.join(", "),
      );
    await this.prisma.$transaction([
      this.prisma.groupPermission.deleteMany({ where: { groupId: id } }),
      ...(requested.length
        ? [
            this.prisma.groupPermission.createMany({
              data: requested.map((permission) => ({
                groupId: id,
                permission,
              })),
            }),
          ]
        : []),
      this.prisma.group.update({ where: { id }, data: { updatedBy: actorId } }),
    ]);
    await this.audit(actorId, "group.set-permissions", id, {
      permissions: requested,
    });
    return this.get(id);
  }

  async assignUser(groupId: string, userId: string, actorId: string) {
    const group = await this.get(groupId);
    if (group.slug === "root-admin") {
      throw new BadRequestException(
        "Root administrator membership can only be granted through the bootstrap seed",
      );
    }
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });
    if (!user) throw new NotFoundException("User not found");
    await this.prisma.userGroup.upsert({
      where: { userId_groupId: { userId, groupId } },
      create: { userId, groupId },
      update: {},
    });
    await this.audit(actorId, "group.assign-user", groupId, { userId });
    return { groupId, userId, assigned: true };
  }

  async removeUser(groupId: string, userId: string, actorId: string) {
    const group = await this.get(groupId);
    if (group.slug === "root-admin")
      throw new BadRequestException(
        "Root administrator membership cannot be removed here",
      );
    await this.prisma.userGroup.deleteMany({ where: { groupId, userId } });
    await this.audit(actorId, "group.remove-user", groupId, { userId });
    return { groupId, userId, removed: true };
  }

  private async audit(
    actorId: string,
    action: string,
    targetId: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    await this.prisma.auditLog.create({
      data: { actorId, action, targetId, metadata },
    });
  }
}
