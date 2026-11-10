import { createHash, timingSafeEqual } from "node:crypto";
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.INTERNAL_API_KEY;
    const request = context.switchToHttp().getRequest<Request>();
    const suppliedHeader = request.headers["x-api-key"];
    const supplied = Array.isArray(suppliedHeader)
      ? suppliedHeader[0]
      : suppliedHeader;
    if (
      !expected ||
      expected.length < 32 ||
      expected.toLowerCase().includes("replace-with") ||
      !supplied
    )
      throw new UnauthorizedException("Invalid API key");

    const expectedHash = createHash("sha256").update(expected).digest();
    const suppliedHash = createHash("sha256").update(supplied).digest();
    if (!timingSafeEqual(expectedHash, suppliedHash)) {
      throw new UnauthorizedException("Invalid API key");
    }
    return true;
  }
}
