import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { auth } from "../dist/lib/auth.js";
import { prisma } from "../dist/prisma/prisma.client.js";

test("get-session returns current effective permissions", async () => {
  const ctx = await auth.$context;
  const now = new Date();
  ctx.internalAdapter.findSession = async () => ({
    session: {
      id: "s",
      token: "test-token",
      userId: "u",
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(Date.now() + 86400000),
    },
    user: {
      id: "u",
      name: "A",
      email: "a@example.com",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
      role: "staff",
    },
  });
  let role = "staff";
  let grants = ["core_user:list", "core_group:list", "core_user:list"];
  prisma.user.findUnique = async () => ({
    role,
    deletedAt: null,
    banned: false,
    banExpires: null,
  });
  prisma.userGroup.findMany = async ({ where }) => {
    assert.deepEqual(where, {
      userId: "u",
      group: { active: true, deletedAt: null },
    });
    return [
      { group: { permissions: grants.map((permission) => ({ permission })) } },
    ];
  };
  const signature = createHmac("sha256", ctx.secret)
    .update("test-token")
    .digest("base64");
  const cookie = `${ctx.authCookies.sessionToken.name}=${encodeURIComponent(`test-token.${signature}`)}`;
  const getSession = () =>
    auth.handler(
      new Request(
        "http://localhost:3001/api/auth/get-session?disableRefresh=true",
        { headers: { cookie } },
      ),
    );
  const first = await getSession();
  assert.equal(first.status, 200);
  assert.equal(first.headers.get("cache-control"), "no-store");
  const body = await first.json();
  assert.deepEqual(body.user.permissions, [
    "core_group:list",
    "core_user:list",
  ]);
  assert.equal(body.user.role, "staff");
  assert.equal(body.session.id, "s");
  grants = [];
  assert.deepEqual((await (await getSession()).json()).user.permissions, []);
  role = "customer";
  grants = ["core_user:list"];
  const customer = await (await getSession()).json();
  assert.equal(customer.user.role, "customer");
  assert.deepEqual(customer.user.permissions, []);
  const anonymous = await auth.handler(
    new Request("http://localhost:3001/api/auth/get-session"),
  );
  assert.equal(await anonymous.json(), null);
});
