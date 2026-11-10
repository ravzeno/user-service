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

export const permissionCatalog = [
  "core_user:list",
  "core_user:get",
  "core_user:create",
  "core_user:update",
  "core_user:delete",
  "core_user:set-role",
  "core_user:ban",
  "core_session:list",
  "core_session:revoke",
  "core_group:list",
  "core_group:view",
  "core_group:create",
  "core_group:edit",
  "core_group:delete",
  "core_group:assign_permissions",
  "core_group:remove_permission",
  "core_group:assign_users",
  "core_group:remove_user",
  "core_permission:list",
  "core_audit_log:list",
] as const;

export type PermissionKey = (typeof permissionCatalog)[number];
