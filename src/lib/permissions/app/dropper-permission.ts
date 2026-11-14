export const dropperPermission = {
  dropper: {
    label: "ระบบ Dropper",
    resources: {
      file: {
        label: "ไฟล์",
        actions: {
          list: { label: "รายการไฟล์" },
          upload: { label: "อัปโหลดไฟล์" },
          download: { label: "ดาวน์โหลดไฟล์" },
          rename: { label: "เปลี่ยนชื่อไฟล์" },
          move: { label: "ย้ายไฟล์" },
          delete: { label: "ลบไฟล์" },
        },
      },
      folder: {
        label: "โฟลเดอร์",
        actions: { create: { label: "สร้างโฟลเดอร์" } },
      },
      trash: {
        label: "ถังขยะ",
        actions: {
          list: { label: "รายการถังขยะ" },
          restore: { label: "กู้คืนไฟล์" },
          delete: { label: "ลบออกจากถังขยะ" },
        },
      },
      upload_transfer: {
        label: "รายการอัปโหลด",
        actions: {
          create: { label: "สร้างรายการอัปโหลด" },
          upload: { label: "ส่งข้อมูลอัปโหลด" },
          get: { label: "ดูสถานะอัปโหลด" },
          list: { label: "รายการอัปโหลด" },
          delete: { label: "ยกเลิกการอัปโหลด" },
        },
      },
      device: {
        label: "อุปกรณ์",
        actions: {
          list: { label: "รายการอุปกรณ์" },
          delete: { label: "ลบอุปกรณ์" },
        },
      },
      pairing: {
        label: "การจับคู่อุปกรณ์",
        actions: {
          list: { label: "รายการคำขอจับคู่" },
          approve: { label: "อนุมัติการจับคู่" },
        },
      },
      storage: {
        label: "พื้นที่จัดเก็บ",
        actions: {
          get: { label: "ดูพื้นที่จัดเก็บ" },
          update: { label: "กำหนดพื้นที่จัดเก็บ" },
        },
      },
    },
  },
} as const;

type DropperResources = typeof dropperPermission.dropper.resources;
export type DropperPermissionKey = {
  [
    Resource in keyof DropperResources
  ]: `dropper_${Resource & string}:${keyof DropperResources[Resource]["actions"] & string}`;
}[keyof DropperResources];

export const dropperPermissionDefinitions = Object.entries(
  dropperPermission.dropper.resources,
).flatMap(([resource, { actions }]) =>
  Object.entries(actions).map(([action, { label }]) => ({
    key: `dropper_${resource}:${action}` as DropperPermissionKey,
    label,
    appName: "dropper" as const,
  })),
);
