import "dotenv/config";
import { prisma } from "../src/prisma/prisma.client.js";
import {
  permissionCatalog,
  permissionDefinitions,
} from "../src/lib/permissions/app/core-permission.js";

async function main() {
  for (const { key, label, appName } of permissionDefinitions) {
    await prisma.permission.upsert({
      where: { key },
      create: {
        key,
        label,
        appName,
      },
      update: { label, appName },
    });
  }

  const rootGroup = await prisma.group.upsert({
    where: { slug: "root-admin" },
    create: {
      slug: "root-admin",
      name: "Root administrator",
      description: "Full service administration",
      active: true,
      isSystem: true,
      createdBy: "system",
      updatedBy: "system",
    },
    update: {
      name: "Root administrator",
      active: true,
      isSystem: true,
      deletedAt: null,
    },
  });
  const existingCustomerGroup = await prisma.group.findUnique({
    where: { slug: "customer-profile-access" },
    select: {
      isSystem: true,
      permissions: {
        where: {
          permission: {
            notIn: ["customer_profile:get", "customer_profile:update"],
          },
        },
        select: { permission: true },
      },
    },
  });
  if (
    existingCustomerGroup &&
    (!existingCustomerGroup.isSystem ||
      existingCustomerGroup.permissions.length)
  ) {
    throw new Error("Customer profile group has unsafe existing configuration");
  }
  const customerGroup = await prisma.group.upsert({
    where: { slug: "customer-profile-access" },
    create: {
      slug: "customer-profile-access",
      name: "Customer profile access",
      description: "Default access to the authenticated user's own profile",
      active: true,
      isSystem: true,
      createdBy: "system",
      updatedBy: "system",
    },
    update: { active: true, isSystem: true, deletedAt: null },
  });
  await prisma.groupPermission.createMany({
    data: ["customer_profile:get", "customer_profile:update"].map(
      (permission) => ({
        groupId: customerGroup.id,
        permission,
      }),
    ),
    skipDuplicates: true,
  });
  await prisma.$executeRaw`
    INSERT INTO "user_group" ("userId", "groupId")
    SELECT "id", ${customerGroup.id} FROM "user" WHERE "deletedAt" IS NULL
    ON CONFLICT ("userId", "groupId") DO NOTHING
  `;
  const staffGroup = await prisma.group.upsert({
    where: { slug: "backoffice-staff" },
    create: {
      slug: "backoffice-staff",
      name: "Backoffice staff",
      description: "Read user records and manage groups",
      active: true,
      isSystem: true,
      createdBy: "system",
      updatedBy: "system",
    },
    update: {
      name: "Backoffice staff",
      active: true,
      isSystem: true,
      deletedAt: null,
    },
  });

  await prisma.groupPermission.deleteMany({ where: { groupId: rootGroup.id } });
  await prisma.groupPermission.createMany({
    data: permissionCatalog.map((permission) => ({
      groupId: rootGroup.id,
      permission,
    })),
  });
  await prisma.groupPermission.deleteMany({
    where: { groupId: staffGroup.id },
  });
  await prisma.groupPermission.createMany({
    data: [
      "core_user:list",
      "core_user:get",
      "core_session:list",
      "core_group:list",
      "core_group:view",
      "core_permission:list",
      "core_audit_log:list",
    ].map((permission) => ({ groupId: staffGroup.id, permission })),
  });

  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  if (adminEmail) {
    const adminUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });
    if (!adminUser) {
      console.warn(
        "Bootstrap account was not found. Sign up and verify this email, then run the seed again.",
      );
    } else if (!adminUser.emailVerified) {
      console.warn(
        "Bootstrap account email is not verified; no root permissions were assigned.",
      );
    } else {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: adminUser.id },
          data: { role: "root" },
        }),
        prisma.userGroup.upsert({
          where: {
            userId_groupId: { userId: adminUser.id, groupId: rootGroup.id },
          },
          create: { userId: adminUser.id, groupId: rootGroup.id },
          update: {},
        }),
      ]);
      console.info("Granted root administrator access to " + adminEmail);
    }
  }

  console.info(
    "Seeded " + permissionCatalog.length + " permissions and default groups.",
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
