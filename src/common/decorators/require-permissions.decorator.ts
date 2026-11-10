import { SetMetadata } from "@nestjs/common";
import type { PermissionKey } from "../../lib/permissions/app/core-permission.js";

export const REQUIRED_PERMISSIONS = "required-permissions";
export const RequirePermissions = (...permissions: PermissionKey[]) =>
  SetMetadata(REQUIRED_PERMISSIONS, permissions);
