export const corePermission = {
  core: {
    label: "ระบบหลัก",
    resources: {
      user: {
        label: "ผู้ใช้งาน",
        actions: {
          list: { label: "รายการผู้ใช้" },
          get: { label: "ดูข้อมูลผู้ใช้" },
          create: { label: "สร้างผู้ใช้" },
          update: { label: "แก้ไขผู้ใช้" },
          delete: { label: "ลบผู้ใช้" },
          "set-role": { label: "กำหนดบทบาท" },
          ban: { label: "แบนผู้ใช้" },
        },
      },
      session: {
        label: "เซสชัน",
        actions: {
          list: { label: "รายการเซสชัน" },
          revoke: { label: "ยกเลิกเซสชัน" },
        },
      },
      group: {
        label: "กลุ่ม",
        actions: {
          list: { label: "รายการกลุ่ม" },
          view: { label: "ดูกลุ่ม" },
          create: { label: "สร้างกลุ่ม" },
          edit: { label: "แก้ไขกลุ่ม" },
          delete: { label: "ลบกลุ่ม" },
          assign_permissions: { label: "กำหนดสิทธิ์" },
          remove_permission: { label: "ลบสิทธิ์" },
          assign_users: { label: "กำหนดสมาชิก" },
          remove_user: { label: "ลบสมาชิก" },
        },
      },
      permission: {
        label: "สิทธิ์",
        actions: { list: { label: "รายการสิทธิ์" } },
      },
      audit_log: {
        label: "ประวัติการจัดการ",
        actions: { list: { label: "รายการประวัติ" } },
      },
    },
  },
} as const;

type CoreResources = typeof corePermission.core.resources;
export type PermissionKey = {
  [
    Resource in keyof CoreResources
  ]: `${"core"}_${Resource & string}:${keyof CoreResources[Resource]["actions"] & string}`;
}[keyof CoreResources];

// Derive the catalog from the same metadata used to define resources and actions.
export const corePermissionDefinitions = Object.entries(
  corePermission.core.resources,
).flatMap(([resource, { actions }]) =>
  Object.entries(actions).map(([action, { label }]) => ({
    key: `core_${resource}:${action}` as PermissionKey,
    label,
    appName: "core" as const,
  })),
);

export const permissionDefinitions = corePermissionDefinitions;
export const permissionCatalog = permissionDefinitions.map(({ key }) => key);
