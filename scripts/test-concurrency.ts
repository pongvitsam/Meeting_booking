// ทดสอบว่า DB กันจองซ้อนจริง (SQLite trigger): ยิงจองช่วงเดียวกัน 10 ครั้งพร้อมกัน ต้องสำเร็จ 1
// รัน: npm run test:concurrency  (ต้องมี .env และรัน migrate + seed แล้ว)
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { createBooking, OverlapError } from "../lib/booking-service";
import { addDays, todayBangkok } from "../lib/time";

async function main() {
  const prisma = new PrismaClient();
  const room = await prisma.room.findFirstOrThrow({ where: { active: true } });
  const date = addDays(todayBangkok(), 3);
  const input = {
    roomId: room.id,
    date,
    start: "13:00",
    end: "14:00",
    bookerName: "ทดสอบ",
    dept: "",
    phone: "",
    title: "concurrency-test",
  };
  const results = await Promise.allSettled(Array.from({ length: 10 }, () => createBooking(input)));
  const ok = results.filter((r) => r.status === "fulfilled").length;
  const overlap = results.filter(
    (r) => r.status === "rejected" && r.reason instanceof OverlapError,
  ).length;
  console.log({ ok, overlap, other: 10 - ok - overlap });
  await prisma.booking.deleteMany({ where: { title: "concurrency-test" } });
  await prisma.$disconnect();
  if (ok !== 1) process.exit(1);
}

main();
