import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, type PrismaClient } from "@prisma/client";
import {
  AvatarStorageService,
  type AvatarFile,
} from "./avatar-storage.service.js";
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
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly avatars: AvatarStorageService,
  ) {}

  async list(q = "", page = 1, limit = 20, scope?: "customer" | "backoffice") {
    const parsedPage = Math.trunc(Number(page) || 1);
    const parsedLimit = Math.trunc(Number(limit) || 20);
    const safePage = Number.isSafeInteger(parsedPage)
      ? Math.max(1, parsedPage)
      : 1;
    const safeLimit = Number.isSafeInteger(parsedLimit)
      ? Math.min(100, Math.max(1, parsedLimit))
      : 20;
    const filters: Prisma.UserWhereInput[] = [{ deletedAt: null }];
    if (q.trim()) {
      filters.push({
        OR: [
          { email: { contains: q.trim(), mode: "insensitive" } },
          { name: { contains: q.trim(), mode: "insensitive" } },
        ],
      });
    }
    if (scope === "customer") filters.push({ role: "customer" });
    if (scope === "backoffice") {
      filters.push({ role: { not: "customer" } });
    }
    const where: Prisma.UserWhereInput = { AND: filters };
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
    const requestedEmail = dto.email.trim().toLowerCase();
    // Better Auth commits its signup transaction independently of this
    // service's Prisma client. Persist an audit attempt first so a later
    // signup failure cannot leave a newly created account with no audit row.
    const auditEvent = await this.prisma.auditLog.create({
      data: {
        actorId,
        action: "user.create",
        metadata: { email: requestedEmail, status: "pending" },
      },
      select: { id: true },
    });
    let created: Awaited<ReturnType<typeof auth.api.signUpEmail>>;
    try {
      created = await auth.api.signUpEmail({
        body: { name: dto.name, email: dto.email, password: dto.password },
      });
    } catch (error) {
      try {
        const userAfterFailure = await this.prisma.user.findUnique({
          where: { email: requestedEmail },
          select: { id: true },
        });
        await this.prisma.auditLog.update({
          where: { id: auditEvent.id },
          data: {
            metadata: {
              email: requestedEmail,
              status: userAfterFailure ? "indeterminate" : "failed",
            },
          },
        });
      } catch (auditError) {
        Logger.error(
          `Failed to mark user.create audit event ${auditEvent.id} as failed`,
          auditError instanceof Error ? auditError.stack : undefined,
          UsersService.name,
        );
      }
      if (error instanceof ConflictException) throw error;
      throw new BadRequestException(
        "Unable to create user. Check email verification and mail configuration.",
      );
    }
    try {
      await this.prisma.auditLog.update({
        where: { id: auditEvent.id },
        data: {
          targetId: created.user.id,
          metadata: { email: created.user.email, status: "completed" },
        },
      });
    } catch (error) {
      Logger.error(
        `Failed to finalize user.create audit event ${auditEvent.id} for ${created.user.id}`,
        error instanceof Error ? error.stack : undefined,
        UsersService.name,
      );
    }
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
    const updated = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data,
        select: safeUserSelect,
      });
      await this.audit(tx, actorId, "user.update", id, {
        changedFields: Object.keys(data),
      });
      return user;
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
    return {
      ...updated,
      ...(emailVerificationSent === undefined ? {} : { emailVerificationSent }),
    };
  }

  async updateAvatar(id: string, file: AvatarFile | undefined) {
    await this.requireActive(id);
    const uploaded = await this.avatars.upload(file);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const result = await tx.user.updateMany({
          where: { id, deletedAt: null },
          data: { image: uploaded.url },
        });
        if (!result.count) throw new NotFoundException("User not found");
        const user = await tx.user.findUniqueOrThrow({
          where: { id },
          select: safeUserSelect,
        });
        await this.audit(tx, id, "user.update", id, {
          changedFields: ["image"],
        });
        return user;
      });
    } catch (error) {
      try {
        await this.avatars.remove(uploaded.key);
      } catch {
        Logger.warn(
          "Failed to remove avatar after profile update failed",
          UsersService.name,
        );
      }
      throw error;
    }
  }

  async setRole(id: string, dto: UpdateRoleDto, actorId: string) {
    await this.requireNonRoot(id);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: { role: dto.role },
        select: safeUserSelect,
      });
      if (dto.role === "customer") {
        await tx.userGroup.deleteMany({ where: { userId: id } });
      }
      await this.audit(tx, actorId, "user.set-role", id, { role: dto.role });
      return updated;
    });
  }

  async softDelete(id: string, actorId: string) {
    await this.requireNonRoot(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      await tx.session.deleteMany({ where: { userId: id } });
      await this.audit(tx, actorId, "user.soft-delete", id);
    });
    return { id, deleted: true };
  }

  async setBanned(
    id: string,
    banned: boolean,
    reason: string | undefined,
    actorId: string,
  ) {
    await this.requireNonRoot(id);
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: {
          banned,
          banReason: banned ? reason || "Suspended by backoffice" : null,
          banExpires: null,
        },
        select: safeUserSelect,
      });
      if (banned) await tx.session.deleteMany({ where: { userId: id } });
      await this.audit(
        tx,
        actorId,
        banned ? "user.ban" : "user.unban",
        id,
        banned ? { reason: user.banReason } : undefined,
      );
      return user;
    });
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
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.session.findFirst({
        where: { id: sessionId, userId: id },
        select: { id: true },
      });
      if (!session) throw new NotFoundException("Session not found");
      await tx.session.delete({ where: { id: sessionId } });
      await this.audit(tx, actorId, "session.revoke", sessionId, {
        userId: id,
      });
      return { id: sessionId, revoked: true };
    });
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
        "The root administrator cannot be changed by backoffice APIs",
      );
    }
  }

  private async audit(
    client: Pick<Prisma.TransactionClient, "auditLog">,
    actorId: string,
    action: string,
    targetId: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    await client.auditLog.create({
      data: {
        actorId,
        action,
        targetId,
        metadata,
      },
    });
  }
}
