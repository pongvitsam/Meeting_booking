// ตรวจว่า migration ทั้งหมดใช้กับฐานข้อมูลเปล่าได้ และ trigger กันจองซ้อนยังอยู่ครบ
// (migration ที่ Prisma สร้างแบบ RedefineTables จะลบ trigger ทิ้ง — สคริปต์นี้จับกรณีนั้น)
// รัน: npm run test:migrations   (ไม่ใช้ฐานข้อมูลจริง สร้างไฟล์ชั่วคราวแล้วลบทิ้ง)
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const REQUIRED_TRIGGERS = [
  "bookings_time_order_ins",
  "bookings_time_order_upd",
  "bookings_no_overlap_ins",
  "bookings_no_overlap_upd",
];

async function main() {
  const dir = mkdtempSync(join(tmpdir(), "mb-migrations-"));
  const url = `file:${join(dir, "test.db").replace(/\\/g, "/")}?connection_limit=1`;
  let failed = false;
  const fail = (msg: string) => {
    console.error("FAIL:", msg);
    failed = true;
  };

  try {
    execFileSync(
      process.execPath,
      ["node_modules/prisma/build/index.js", "migrate", "deploy", "--schema", "prisma/schema.prisma"],
      { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" },
    );
    console.log("OK: apply migrations ทั้งหมดบนฐานเปล่าได้");

    const prisma = new PrismaClient({ datasources: { db: { url } } });
    try {
      const rows = await prisma.$queryRawUnsafe<{ name: string }[]>(
        "SELECT name FROM sqlite_master WHERE type = 'trigger'",
      );
      const have = new Set(rows.map((r) => r.name));
      for (const t of REQUIRED_TRIGGERS) {
        if (have.has(t)) console.log(`OK: trigger ${t}`);
        else fail(`trigger ${t} หายไป (migration ล่าสุดอาจเป็น RedefineTables)`);
      }

      // ลองจองซ้อนจริง: ต้องถูกปฏิเสธ
      const room = await prisma.room.create({ data: { name: "t", capacity: 1, equipment: "" } });
      const base = { roomId: room.id, bookerName: "a", dept: "", phone: "", title: "t" };
      const t0 = new Date("2030-01-01T02:00:00Z");
      const t1 = new Date("2030-01-01T03:00:00Z");
      await prisma.booking.create({ data: { ...base, startsAt: t0, endsAt: t1 } });
      let blocked = false;
      try {
        await prisma.booking.create({
          data: { ...base, startsAt: new Date("2030-01-01T02:30:00Z"), endsAt: new Date("2030-01-01T03:30:00Z") },
        });
      } catch {
        blocked = true;
      }
      if (blocked) console.log("OK: การจองซ้อนถูกปฏิเสธ");
      else fail("การจองซ้อนไม่ถูกปฏิเสธ");

      // ตาราง log ต้องมี
      await prisma.bookingLog.count();
      console.log("OK: ตาราง booking_logs");
    } finally {
      await prisma.$disconnect();
    }
  } catch (e) {
    fail(e instanceof Error ? e.message : String(e));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  if (failed) process.exit(1);
  console.log("migration ทั้งหมดผ่าน");
}

main();
