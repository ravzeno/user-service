-- Preserve grants while moving the existing backoffice catalog to its own namespace.
ALTER TABLE "permission" ALTER COLUMN "appName" DROP DEFAULT;
INSERT INTO "permission" ("key", "label", "appName", "createdAt", "updatedAt")
SELECT 'backoffice_' || substring("key" FROM 6), "label", 'backoffice', "createdAt", CURRENT_TIMESTAMP
FROM "permission" WHERE "key" IN ('core_user:list', 'core_user:get', 'core_user:create', 'core_user:update', 'core_user:delete', 'core_user:set-role', 'core_user:ban', 'core_session:list', 'core_session:revoke', 'core_group:list', 'core_group:view', 'core_group:create', 'core_group:edit', 'core_group:delete', 'core_group:assign_permissions', 'core_group:remove_permission', 'core_group:assign_users', 'core_group:remove_user', 'core_permission:list', 'core_audit_log:list')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "group_permission" ("groupId", "permission")
SELECT "groupId", 'backoffice_' || substring("permission" FROM 6)
FROM "group_permission" WHERE "permission" IN ('core_user:list', 'core_user:get', 'core_user:create', 'core_user:update', 'core_user:delete', 'core_user:set-role', 'core_user:ban', 'core_session:list', 'core_session:revoke', 'core_group:list', 'core_group:view', 'core_group:create', 'core_group:edit', 'core_group:delete', 'core_group:assign_permissions', 'core_group:remove_permission', 'core_group:assign_users', 'core_group:remove_user', 'core_permission:list', 'core_audit_log:list')
ON CONFLICT ("groupId", "permission") DO NOTHING;
DELETE FROM "group_permission" WHERE "permission" IN ('core_user:list', 'core_user:get', 'core_user:create', 'core_user:update', 'core_user:delete', 'core_user:set-role', 'core_user:ban', 'core_session:list', 'core_session:revoke', 'core_group:list', 'core_group:view', 'core_group:create', 'core_group:edit', 'core_group:delete', 'core_group:assign_permissions', 'core_group:remove_permission', 'core_group:assign_users', 'core_group:remove_user', 'core_permission:list', 'core_audit_log:list');
DELETE FROM "permission" WHERE "key" IN ('core_user:list', 'core_user:get', 'core_user:create', 'core_user:update', 'core_user:delete', 'core_user:set-role', 'core_user:ban', 'core_session:list', 'core_session:revoke', 'core_group:list', 'core_group:view', 'core_group:create', 'core_group:edit', 'core_group:delete', 'core_group:assign_permissions', 'core_group:remove_permission', 'core_group:assign_users', 'core_group:remove_user', 'core_permission:list', 'core_audit_log:list');

INSERT INTO "permission" ("key", "label", "appName", "updatedAt") VALUES
  ('customer_profile:get', 'ดูข้อมูลส่วนตัว', 'customer', CURRENT_TIMESTAMP),
  ('customer_profile:update', 'แก้ไขข้อมูลส่วนตัว', 'customer', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET "label" = EXCLUDED."label", "appName" = EXCLUDED."appName", "updatedAt" = CURRENT_TIMESTAMP;

-- Do not reuse a user-managed group or spread unrelated privileges to every user.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "group" g WHERE g."slug" = 'customer-profile-access'
      AND (NOT g."isSystem" OR EXISTS (
        SELECT 1 FROM "group_permission" gp WHERE gp."groupId" = g."id"
          AND gp."permission" NOT IN ('customer_profile:get', 'customer_profile:update')
      ))
  ) THEN
    RAISE EXCEPTION 'customer-profile-access group has unsafe existing configuration';
  END IF;
END $$;

INSERT INTO "group" ("id", "slug", "name", "description", "active", "isSystem", "createdBy", "updatedBy", "updatedAt")
VALUES (gen_random_uuid()::text, 'customer-profile-access', 'Customer profile access', 'Default access to the authenticated user''s own profile', true, true, 'system', 'system', CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE SET "active" = true, "deletedAt" = NULL, "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "group_permission" ("groupId", "permission")
SELECT g."id", p."key" FROM "group" g CROSS JOIN "permission" p
WHERE g."slug" = 'customer-profile-access' AND p."key" IN ('customer_profile:get', 'customer_profile:update')
ON CONFLICT ("groupId", "permission") DO NOTHING;

INSERT INTO "user_group" ("userId", "groupId")
SELECT u."id", g."id" FROM "user" u CROSS JOIN "group" g
WHERE u."deletedAt" IS NULL AND g."slug" = 'customer-profile-access'
ON CONFLICT ("userId", "groupId") DO NOTHING;
