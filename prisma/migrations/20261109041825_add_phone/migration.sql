-- เพิ่มช่องเบอร์ต่อแยกจากแผนก
-- ใช้ ADD COLUMN แทนการสร้างตารางใหม่ เพื่อไม่ให้ trigger กันจองซ้อนถูกลบ
ALTER TABLE "bookings" ADD COLUMN "phone" TEXT NOT NULL DEFAULT '';
