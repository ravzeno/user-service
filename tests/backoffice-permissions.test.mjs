import { test } from "node:test";
import assert from "node:assert/strict";
import { EffectivePermissionsService } from "../dist/common/guards/effective-permissions.service.js";
import { PermissionGuard } from "../dist/common/guards/permission.guard.js";
import { GroupsService } from "../dist/modules/group/groups.service.js";
import { UsersService } from "../dist/modules/user/users.service.js";
import { permissionCatalog } from "../dist/lib/permissions/app/core-permission.js";
import { PermissionBackofficeController } from "../dist/modules/permission/permission.backoffice.controller.js";
import { PermissionInternalController } from "../dist/modules/permission/permission.internal.controller.js";
import { InternalApiKeyGuard } from "../dist/common/guards/internal-api-key.guard.js";

test("internal catalog requires an API key and filters by application", async () => {
  const previous = process.env.INTERNAL_API_KEY;
  process.env.INTERNAL_API_KEY = "test-internal-api-key-at-least-32-characters";
  try {
    const guard = new InternalApiKeyGuard();
    const request = (key) => ({ switchToHttp: () => ({ getRequest: () => ({ headers: key ? { "x-api-key": key } : {} }) }) });
    assert.throws(() => guard.canActivate(request()), { status: 401 });
    assert.throws(() => guard.canActivate(request("wrong")), { status: 401 });
    assert.equal(guard.canActivate(request(process.env.INTERNAL_API_KEY)), true);
    let query;
    const controller = new PermissionInternalController({ permission: { findMany: async (value) => { query = value; return []; } } });
    await controller.list("dropper");
    assert.deepEqual(query.where, { appName: "dropper" });
    await controller.list();
    assert.deepEqual(query.where, {});
    assert.throws(() => controller.list("unknown"), { status: 400 });
  } finally {
    if (previous === undefined) delete process.env.INTERNAL_API_KEY;
    else process.env.INTERNAL_API_KEY = previous;
  }
});

test("dropper permissions are available and can be filtered by app", async () => {
  assert.ok(permissionCatalog.includes("dropper_device:list"));
  assert.ok(permissionCatalog.includes("dropper_file:download"));
  assert.ok(permissionCatalog.includes("dropper_pairing:approve"));
  assert.equal(new Set(permissionCatalog).size, permissionCatalog.length);
  const queries = [];
  const controller = new PermissionBackofficeController({
    permission: { findMany: async (query) => { queries.push(query); return []; } },
  });
  await controller.list();
  await controller.list("dropper");
  await controller.list("core");
  assert.deepEqual(queries.map(({ where }) => where), [{}, { appName: "dropper" }, { appName: "core" }]);
  assert.throws(() => controller.list("unknown"), { status: 400 });
});

const context = (role) => ({
  getHandler: () => {},
  getClass: () => {},
  switchToHttp: () => ({
    getRequest: () => ({ authContext: { user: { id: "u", role } } }),
  }),
});
test("only backoffice roles can exercise group permissions", async () => {
  const guard = new PermissionGuard(
    {
      getAllAndOverride: () => ({
        permissions: ["core_user:list"],
        mode: "any",
      }),
    },
    new EffectivePermissionsService({
      userGroup: {
        findMany: async () => [
          { group: { permissions: [{ permission: "core_user:list" }] } },
        ],
      },
    }),
  );
  await assert.rejects(guard.canActivate(context("customer")), { status: 403 });
  assert.equal(await guard.canActivate(context("staff")), true);
  assert.equal(await guard.canActivate(context("root")), true);
  assert.ok(!permissionCatalog.some((key) => key.startsWith("customer_")));
});
test("customer cannot be assigned to a group", async () => {
  const service = new GroupsService({
    group: { findFirst: async () => ({ slug: "staff", isSystem: false }) },
    user: { findFirst: async () => ({ id: "u", role: "customer" }) },
  });
  await assert.rejects(service.assignUser("g", "u", "actor"), { status: 400 });
});
test("changing a staff user to customer removes memberships", async () => {
  let removed;
  const prisma = {
    user: {
      findFirst: async () => ({ id: "u", role: "staff" }),
      update: async () => ({ id: "u", role: "customer" }),
    },
    userGroup: {
      deleteMany: async (args) => {
        removed = args;
      },
    },
    auditLog: { create: async () => {} },
    $transaction: async (fn) => fn(prisma),
  };
  await new UsersService(prisma, {}).setRole(
    "u",
    { role: "customer" },
    "actor",
  );
  assert.deepEqual(removed, { where: { userId: "u" } });
});

test("effective permissions are unique and only use active, undeleted groups", async () => {
  let query;
  const service = new EffectivePermissionsService({
    userGroup: {
      findMany: async (args) => {
        query = args;
        return [
          {
            group: {
              permissions: [
                { permission: "core_user:list" },
                { permission: "core_group:list" },
              ],
            },
          },
          { group: { permissions: [{ permission: "core_user:list" }] } },
        ];
      },
    },
  });
  assert.deepEqual(await service.forUser({ id: "u", role: "staff" }), [
    "core_group:list",
    "core_user:list",
  ]);
  assert.deepEqual(query.where, {
    userId: "u",
    group: { active: true, deletedAt: null },
  });
  query = undefined;
  assert.deepEqual(await service.forUser({ id: "u", role: "customer" }), []);
  assert.equal(query, undefined);
});

test("permission decorator and guard support any and all modes", async () => {
  const { RequirePermission, REQUIRED_PERMISSIONS } =
    await import("../dist/common/decorators/require-permissions.decorator.js");
  const handler = () => {};
  RequirePermission(["core_user:list", "core_group:list"])(handler);
  let metadata = Reflect.getMetadata(REQUIRED_PERMISSIONS, handler);
  assert.deepEqual(metadata, {
    permissions: ["core_user:list", "core_group:list"],
    mode: "any",
  });
  const guard = new PermissionGuard(
    { getAllAndOverride: () => metadata },
    { forUser: async () => ["core_user:list"] },
  );
  assert.equal(await guard.canActivate(context("staff")), true);
  RequirePermission(["core_user:list", "core_group:list"], "all")(handler);
  metadata = Reflect.getMetadata(REQUIRED_PERMISSIONS, handler);
  await assert.rejects(guard.canActivate(context("staff")), { status: 403 });
  metadata = { permissions: [], mode: "all" };
  await assert.rejects(guard.canActivate(context("staff")), { status: 403 });
});
