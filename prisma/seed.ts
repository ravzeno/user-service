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
