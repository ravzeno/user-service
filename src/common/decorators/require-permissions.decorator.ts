import { SetMetadata } from "@nestjs/common";
import type { PermissionKey } from "../../lib/permissions/app/core-permission.js";

export const REQUIRED_PERMISSIONS = "required-permissions";
export type PermissionMode = "any" | "all";
export interface RequiredPermissions {
  permissions: readonly PermissionKey[];
  mode: PermissionMode;
}

export const RequirePermission = (
  permission: PermissionKey | readonly PermissionKey[],
  mode: PermissionMode = "any",
) =>
  SetMetadata(REQUIRED_PERMISSIONS, {
    permissions: typeof permission === "string" ? [permission] : permission,
    mode,
  } satisfies RequiredPermissions);
