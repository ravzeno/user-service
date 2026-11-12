import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
      include: {
        _count: {
          select: {
            users: { where: { user: { deletedAt: null } } },
            permissions: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async get(id: string) {
    const group = await this.prisma.group.findFirst({
      where: { id, deletedAt: null },
      include: {
        permissions: { orderBy: { permission: "asc" } },
        _count: { select: { users: { where: { user: { deletedAt: null } } } } },
      },
    });
    if (!group) throw new NotFoundException("Group not found");
    return group;
  }

  async listMembers(id: string, page = 1, limit = 20) {
    const group = await this.prisma.group.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!group) throw new NotFoundException("Group not found");

    const parsedPage = Math.trunc(Number(page) || 1);
    const parsedLimit = Math.trunc(Number(limit) || 20);
    const currentPage = Number.isSafeInteger(parsedPage)
      ? Math.max(1, parsedPage)
      : 1;
    const pageSize = Number.isSafeInteger(parsedLimit)
      ? Math.min(100, Math.max(1, parsedLimit))
      : 20;
    const where: Prisma.UserGroupWhereInput = {
      groupId: id,
      user: { deletedAt: null },
    };
    const [members, total] = await this.prisma.$transaction([
      this.prisma.userGroup.findMany({
        where,
        select: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              emailVerified: true,
              image: true,
              phoneNumber: true,
              role: true,
              createdAt: true,
            },
          },
        },
        orderBy: [{ user: { name: "asc" } }, { userId: "asc" }],
        skip: (currentPage - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.userGroup.count({ where }),
    ]);
    return {
      items: members.map((membership) => membership.user),
      page: currentPage,
      limit: pageSize,
      total,
    };
  }

  async create(dto: CreateGroupDto, actorId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const group = await tx.group.create({
          data: { ...dto, createdBy: actorId, updatedBy: actorId },
        });
        await this.audit(tx, actorId, "group.create", group.id, {
          slug: group.slug,
        });
        return group;
      });
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
    return this.prisma.$transaction(async (tx) => {
      const group = await tx.group.update({
        where: { id },
        data: { ...dto, updatedBy: actorId },
      });
      await this.audit(tx, actorId, "group.update", id, {
        changedFields: Object.keys(dto),
      });
      return group;
    });
  }

  async remove(id: string, actorId: string) {
    const existing = await this.get(id);
    if (existing.isSystem)
      throw new BadRequestException("System groups cannot be deleted");
    await this.prisma.$transaction(async (tx) => {
      await tx.group.update({
        where: { id },
        data: { deletedAt: new Date(), active: false, updatedBy: actorId },
      });
      await this.audit(tx, actorId, "group.soft-delete", id);
    });
    return { id, deleted: true };
  }

  async setPermissions(id: string, dto: SetPermissionsDto, actorId: string) {
    const requested = [...new Set(dto.permissions)];
    const invalid = requested.filter(
      (permission) => !permissionCatalog.includes(permission as PermissionKey),
    );
    if (invalid.length)
      throw new BadRequestException(
        "Unknown permission: " + invalid.join(", "),
      );
    await this.prisma.$transaction(async (tx) => {
      const group = await tx.group.findFirst({
        where: { id, deletedAt: null },
        select: {
          id: true,
          slug: true,
          isSystem: true,
          permissions: { select: { permission: true } },
        },
      });
      if (!group) throw new NotFoundException("Group not found");
      if (group.isSystem && group.slug === "customer-profile-access") {
        throw new BadRequestException(
          "Customer permissions are managed by the system",
        );
      }
      if (group.isSystem && group.slug === "root-admin") {
        throw new BadRequestException(
          "Root administrator permissions are fixed",
        );
      }

      const memberships = await tx.userGroup.findMany({
        where: { userId: actorId, group: { active: true, deletedAt: null } },
        select: {
          group: {
            select: {
              slug: true,
              permissions: { select: { permission: true } },
            },
          },
        },
      });
      const isRoot = memberships.some(
        (membership) => membership.group.slug === "root-admin",
      );
      if (!isRoot) {
        const actorPermissions = new Set(
          memberships.flatMap((membership) =>
            membership.group.permissions.map((item) => item.permission),
          ),
        );
        const existingPermissions = new Set(
          group.permissions.map((item) => item.permission),
        );
        const unauthorizedAdditions = requested.filter(
          (permission) =>
            !existingPermissions.has(permission) &&
            !actorPermissions.has(permission),
        );
        if (unauthorizedAdditions.length) {
          throw new ForbiddenException(
            "Cannot grant permissions the actor does not hold: " +
              unauthorizedAdditions.join(", "),
          );
        }
      }

      await tx.groupPermission.deleteMany({ where: { groupId: id } });
      if (requested.length) {
        await tx.groupPermission.createMany({
          data: requested.map((permission) => ({ groupId: id, permission })),
        });
      }
      await tx.group.update({ where: { id }, data: { updatedBy: actorId } });
      await this.audit(tx, actorId, "group.set-permissions", id, {
        permissions: requested,
      });
    });
    return this.get(id);
  }

  async assignUser(groupId: string, userId: string, actorId: string) {
    const group = await this.get(groupId);
    if (group.isSystem && group.slug === "customer-profile-access") {
      throw new BadRequestException(
        "Customer membership is managed by the system",
      );
    }
    if (group.slug === "root-admin") {
      throw new BadRequestException(
        "Root administrator membership is managed separately",
      );
    }
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, role: true },
    });
    if (!user) throw new NotFoundException("User not found");
    if (user.role !== "staff" && user.role !== "root") {
      throw new BadRequestException(
        "Only backoffice users can be assigned to groups",
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.userGroup.upsert({
        where: { userId_groupId: { userId, groupId } },
        create: { userId, groupId },
        update: {},
      });
      await this.audit(tx, actorId, "group.assign-user", groupId, { userId });
    });
    return { groupId, userId, assigned: true };
  }

  async removeUser(groupId: string, userId: string, actorId: string) {
    const group = await this.get(groupId);
    if (group.isSystem && group.slug === "customer-profile-access") {
      throw new BadRequestException(
        "Customer membership is managed by the system",
      );
    }
    if (group.slug === "root-admin")
      throw new BadRequestException(
        "Root administrator membership cannot be removed here",
      );
    await this.prisma.$transaction(async (tx) => {
      await tx.userGroup.deleteMany({ where: { groupId, userId } });
      await this.audit(tx, actorId, "group.remove-user", groupId, { userId });
    });
    return { groupId, userId, removed: true };
  }

  private async audit(
    tx: Prisma.TransactionClient,
    actorId: string,
    action: string,
    targetId: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    await tx.auditLog.create({
      data: { actorId, action, targetId, metadata },
    });
  }
}
