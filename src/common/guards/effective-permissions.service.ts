import { Inject, Injectable } from "@nestjs/common";
import type { PrismaClient } from "@prisma/client";
import { PRISMA_CLIENT } from "../../prisma/prisma.client.js";

@Injectable()
export class EffectivePermissionsService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async forUser(user: { id: string; role: string }): Promise<string[]> {
    if (user.role !== "staff" && user.role !== "root") return [];

    const memberships = await this.prisma.userGroup.findMany({
      where: { userId: user.id, group: { active: true, deletedAt: null } },
      select: {
        group: { select: { permissions: { select: { permission: true } } } },
      },
    });
    return [
      ...new Set(
        memberships.flatMap((m) =>
          m.group.permissions.map((p) => p.permission),
        ),
      ),
    ].sort();
  }
}
