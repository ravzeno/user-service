ALTER TABLE "permission" RENAME COLUMN "description" TO "label";

UPDATE "permission"
SET "label" = CASE "key"
  WHEN 'core_user:list' THEN 'รายการผู้ใช้'
  WHEN 'core_user:get' THEN 'ดูข้อมูลผู้ใช้'
  WHEN 'core_user:create' THEN 'สร้างผู้ใช้'
  WHEN 'core_user:update' THEN 'แก้ไขผู้ใช้'
  WHEN 'core_user:delete' THEN 'ลบผู้ใช้'
  WHEN 'core_user:set-role' THEN 'กำหนดบทบาท'
  WHEN 'core_user:ban' THEN 'แบนผู้ใช้'
  WHEN 'core_session:list' THEN 'รายการเซสชัน'
  WHEN 'core_session:revoke' THEN 'ยกเลิกเซสชัน'
  WHEN 'core_group:list' THEN 'รายการกลุ่ม'
  WHEN 'core_group:view' THEN 'ดูกลุ่ม'
  WHEN 'core_group:create' THEN 'สร้างกลุ่ม'
  WHEN 'core_group:edit' THEN 'แก้ไขกลุ่ม'
  WHEN 'core_group:delete' THEN 'ลบกลุ่ม'
  WHEN 'core_group:assign_permissions' THEN 'กำหนดสิทธิ์'
  WHEN 'core_group:remove_permission' THEN 'ลบสิทธิ์'
  WHEN 'core_group:assign_users' THEN 'กำหนดสมาชิก'
  WHEN 'core_group:remove_user' THEN 'ลบสมาชิก'
  WHEN 'core_permission:list' THEN 'รายการสิทธิ์'
  WHEN 'core_audit_log:list' THEN 'รายการประวัติ'
  ELSE "label"
END;
