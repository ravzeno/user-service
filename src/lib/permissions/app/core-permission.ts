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

export const corePermissionDefinitions = [
  {
    key: "core_user:list",
    label: corePermission.core.resources.user.actions.list.label,
    appName: "core",
  },
  {
    key: "core_user:get",
    label: corePermission.core.resources.user.actions.get.label,
    appName: "core",
  },
  {
    key: "core_user:create",
    label: corePermission.core.resources.user.actions.create.label,
    appName: "core",
  },
  {
    key: "core_user:update",
    label: corePermission.core.resources.user.actions.update.label,
    appName: "core",
  },
  {
    key: "core_user:delete",
    label: corePermission.core.resources.user.actions.delete.label,
    appName: "core",
  },
  {
    key: "core_user:set-role",
    label: corePermission.core.resources.user.actions["set-role"].label,
    appName: "core",
  },
  {
    key: "core_user:ban",
    label: corePermission.core.resources.user.actions.ban.label,
    appName: "core",
  },
  {
    key: "core_session:list",
    label: corePermission.core.resources.session.actions.list.label,
    appName: "core",
  },
  {
    key: "core_session:revoke",
    label: corePermission.core.resources.session.actions.revoke.label,
    appName: "core",
  },
  {
    key: "core_group:list",
    label: corePermission.core.resources.group.actions.list.label,
    appName: "core",
  },
  {
    key: "core_group:view",
    label: corePermission.core.resources.group.actions.view.label,
    appName: "core",
  },
  {
    key: "core_group:create",
    label: corePermission.core.resources.group.actions.create.label,
    appName: "core",
  },
  {
    key: "core_group:edit",
    label: corePermission.core.resources.group.actions.edit.label,
    appName: "core",
  },
  {
    key: "core_group:delete",
    label: corePermission.core.resources.group.actions.delete.label,
    appName: "core",
  },
  {
    key: "core_group:assign_permissions",
    label: corePermission.core.resources.group.actions.assign_permissions.label,
    appName: "core",
  },
  {
    key: "core_group:remove_permission",
    label: corePermission.core.resources.group.actions.remove_permission.label,
    appName: "core",
  },
  {
    key: "core_group:assign_users",
    label: corePermission.core.resources.group.actions.assign_users.label,
    appName: "core",
  },
  {
    key: "core_group:remove_user",
    label: corePermission.core.resources.group.actions.remove_user.label,
    appName: "core",
  },
  {
    key: "core_permission:list",
    label: corePermission.core.resources.permission.actions.list.label,
    appName: "core",
  },
  {
    key: "core_audit_log:list",
    label: corePermission.core.resources.audit_log.actions.list.label,
    appName: "core",
  },
] as const;

export const customerPermissionDefinitions = [
  {
    key: "customer_profile:get",
    label: "ดูข้อมูลส่วนตัว",
    appName: "customer",
  },
  {
    key: "customer_profile:update",
    label: "แก้ไขข้อมูลส่วนตัว",
    appName: "customer",
  },
] as const;

export const permissionDefinitions = [
  ...corePermissionDefinitions,
  ...customerPermissionDefinitions,
] as const;

export const permissionCatalog = permissionDefinitions.map(({ key }) => key);

export type PermissionKey = (typeof permissionDefinitions)[number]["key"];
