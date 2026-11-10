import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, type PrismaClient } from "@prisma/client";
import { auth } from "../../lib/auth.js";
import { PRISMA_CLIENT } from "../../prisma/prisma.client.js";
import type {
  CreateUserDto,
  UpdateRoleDto,
  UpdateUserDto,
} from "./dto/user.dto.js";

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  image: true,
  phoneNumber: true,
  role: true,
  banned: true,
  banReason: true,
  banExpires: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async list(q = "", page = 1, limit = 20) {
    const parsedPage = Math.trunc(Number(page) || 1);
    const parsedLimit = Math.trunc(Number(limit) || 20);
    const safePage = Number.isSafeInteger(parsedPage)
      ? Math.max(1, parsedPage)
      : 1;
    const safeLimit = Number.isSafeInteger(parsedLimit)
      ? Math.min(100, Math.max(1, parsedLimit))
      : 20;
    const where = {
      deletedAt: null,
      ...(q.trim()
        ? {
            OR: [
              { email: { contains: q.trim(), mode: "insensitive" as const } },
              { name: { contains: q.trim(), mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: safeUserSelect,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, page: safePage, limit: safeLimit, total };
  }

  async get(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: safeUserSelect,
    });
    if (!user) throw new NotFoundException("User not found");
    const groups = await this.prisma.userGroup.findMany({
      where: { userId: id, group: { deletedAt: null } },
      select: { group: { select: { id: true, slug: true, name: true } } },
    });
    return { ...user, groups: groups.map((membership) => membership.group) };
  }

  async create(dto: CreateUserDto, actorId: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException("Email is already registered");
    let created: Awaited<ReturnType<typeof auth.api.signUpEmail>>;
    try {
      created = await auth.api.signUpEmail({
        body: { name: dto.name, email: dto.email, password: dto.password },
      });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      throw new BadRequestException(
        "Unable to create user. Check email verification and mail configuration.",
      );
    }
    await this.audit(actorId, "user.create", created.user.id, {
      email: created.user.email,
    });
    return this.get(created.user.id);
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    const existing = await this.requireActive(id);
    const requestedEmail = dto.email?.trim().toLowerCase();
    const emailChanged =
      requestedEmail !== undefined &&
      requestedEmail !== existing.email.toLowerCase();
    if (emailChanged && requestedEmail) {
      const duplicate = await this.prisma.user.findFirst({
        where: {
          email: { equals: requestedEmail, mode: "insensitive" },
          id: { not: id },
        },
        select: { id: true },
      });
      if (duplicate) throw new ConflictException("Email is already registered");
    }
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.phoneNumber !== undefined) data.phoneNumber = dto.phoneNumber;
    if (emailChanged && requestedEmail) {
      data.email = requestedEmail;
      data.emailVerified = false;
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: safeUserSelect,
    });
    let emailVerificationSent: boolean | undefined;
    if (emailChanged && requestedEmail) {
      try {
        const result = await auth.api.sendVerificationEmail({
          body: { email: requestedEmail },
        });
        emailVerificationSent = result.status;
      } catch {
        emailVerificationSent = false;
      }
    }
    await this.audit(actorId, "user.update", id, {
      changedFields: Object.keys(data),
      ...(emailVerificationSent === undefined ? {} : { emailVerificationSent }),
    });
    return {
      ...updated,
      ...(emailVerificationSent === undefined ? {} : { emailVerificationSent }),
    };
  }

  async setRole(id: string, dto: UpdateRoleDto, actorId: string) {
    await this.requireNonRoot(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
      select: safeUserSelect,
    });
    await this.audit(actorId, "user.set-role", id, { role: dto.role });
    return updated;
  }

  async softDelete(id: string, actorId: string) {
    await this.requireNonRoot(id);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
      this.prisma.session.deleteMany({ where: { userId: id } }),
    ]);
    await this.audit(actorId, "user.soft-delete", id);
    return { id, deleted: true };
  }

  async setBanned(
    id: string,
    banned: boolean,
    reason: string | undefined,
    actorId: string,
  ) {
    await this.requireNonRoot(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        banned,
        banReason: banned ? reason || "Suspended by backoffice" : null,
        banExpires: null,
      },
      select: safeUserSelect,
    });
    if (banned) await this.prisma.session.deleteMany({ where: { userId: id } });
    await this.audit(
      actorId,
      banned ? "user.ban" : "user.unban",
      id,
      banned ? { reason: user.banReason } : undefined,
    );
    return user;
  }

  async listSessions(id: string) {
    await this.requireActive(id);
    return this.prisma.session.findMany({
      where: { userId: id },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
        ipAddress: true,
        userAgent: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async revokeSession(id: string, sessionId: string, actorId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId: id },
      select: { id: true },
    });
    if (!session) throw new NotFoundException("Session not found");
    await this.prisma.session.delete({ where: { id: sessionId } });
    await this.audit(actorId, "session.revoke", sessionId, { userId: id });
    return { id: sessionId, revoked: true };
  }

  async me(id: string) {
    return this.get(id);
  }

  private async requireActive(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, role: true, email: true },
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  private async requireNonRoot(id: string) {
    const user = await this.requireActive(id);
    if (user.role === "root") {
      throw new ForbiddenException(
        "The bootstrap administrator cannot be changed by backoffice APIs",
      );
    }
  }

  private async audit(
    actorId: string,
    action: string,
    targetId: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action,
        targetId,
        metadata,
      },
    });
  }
}
