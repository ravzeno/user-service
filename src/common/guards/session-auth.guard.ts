import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { PrismaClient } from "@prisma/client";
import { fromNodeHeaders } from "better-auth/node";
import type { Request } from "express";
import { auth } from "../../lib/auth.js";
import { PRISMA_CLIENT } from "../../prisma/prisma.client.js";

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });
    if (!session) throw new UnauthorizedException("Authentication required");

    const user = await this.prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        deletedAt: true,
        banned: true,
        banExpires: true,
      },
    });
    const banExpired = !!user?.banExpires && user.banExpires <= new Date();
    if (!user || user.deletedAt || (user.banned && !banExpired)) {
      throw new UnauthorizedException("Account is unavailable");
    }

    (
      request as Request & {
        authContext: { user: typeof user; session: typeof session };
      }
    ).authContext = {
      user,
      session,
    };
    return true;
  }
}
