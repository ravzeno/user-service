// Exercise the real Nest application and HTTP serialization while replacing
// only external state (the database and the Better Auth session lookup).
process.env.ENABLE_API_DOCS = process.argv[2];
process.env.INTERNAL_API_KEY = "contract-test-internal-api-key-1234567890";

const { prisma } = await import("../dist/prisma/prisma.client.js");
const { auth } = await import("../dist/lib/auth.js");
const { permissionCatalog } = await import("../dist/lib/permissions/app/core-permission.js");
const { createApplication } = await import("../dist/app.factory.js");

const date = new Date("2026-01-02T03:04:05.000Z");
const user = {
  id: "user-1", name: "Example", email: "user@example.com",
  emailVerified: true, image: null, phoneNumber: null, role: "staff",
  banned: false, banReason: null, banExpires: null, deletedAt: null,
  createdAt: date, updatedAt: date,
};
const group = {
  id: "group-1", slug: "example", name: "Example group", description: null,
  active: true, isSystem: false, deletedAt: null, createdBy: "user-1",
  updatedBy: "user-1", createdAt: date, updatedAt: date,
};
function selected(record, select) {
  if (!select) return record;
  return Object.fromEntries(Object.entries(select)
    .filter(([, value]) => value === true)
    .map(([key]) => [key, record[key]]));
}

prisma.user = {
  findUnique: async () => user,
  findFirst: async ({ where, select }) => where.id === "missing" ? null : selected(user, select),
  findMany: async ({ select }) => [selected(user, select)],
  count: async () => 1,
};
prisma.group = {
  findFirst: async ({ where, select }) => {
    if (where.id === "missing") return null;
    if (select) return selected(group, select);
    return { ...group, permissions: [], _count: { users: 1 } };
  },
  findMany: async () => [{ ...group, _count: { users: 1, permissions: 0 } }],
};
prisma.userGroup = {
  findMany: async ({ select }) => {
    if (select?.user) return [{ user: selected(user, select.user.select) }];
    if (select?.group?.select?.permissions) {
      return [{ group: { permissions: permissionCatalog.map((permission) => ({ permission })) } }];
    }
    return [{ group: { id: "group-1", slug: "example", name: "Example group" } }];
  },
  count: async () => 1,
};
prisma.permission = {
  findMany: async () => [{ key: "core_user:list", label: "รายการผู้ใช้", appName: "core" }],
};
prisma.auditLog = {
  findMany: async () => [{ id: "audit-1", actorId: user.id, action: "user.update", targetId: user.id, metadata: null, ipAddress: null, createdAt: date, actor: { id: user.id, name: user.name, email: user.email } }],
  count: async () => 1,
};
prisma.$queryRaw = async () => [{ "?column?": 1 }];
prisma.$transaction = async (operations) => Array.isArray(operations)
  ? Promise.all(operations)
  : operations(prisma);
auth.api.getSession = async ({ headers }) => headers.get("x-test-auth") === "yes"
  ? { user: { id: user.id }, session: { id: "session-1", userId: user.id } }
  : null;

const app = await createApplication();
await app.listen(0, "127.0.0.1");
const address = app.getHttpServer().address();
process.send({ port: address.port });
process.on("message", async (message) => {
  if (message === "close") {
    await app.close();
    process.exit(0);
  }
});
