// สร้างข้อมูลจองตัวอย่างทั้งเดือน สำหรับทดลองดูหน้าตาปฏิทิน
//   npm run mock:seed            สร้างข้อมูลของเดือนปัจจุบัน (เวลาไทย)
//   npm run mock:seed -- 2026-12 สร้างของเดือนที่ระบุ (YYYY-MM ค.ศ.)
//   npm run mock:clear           ลบเฉพาะข้อมูลตัวอย่างที่สร้างจากสคริปต์นี้ (ไม่แตะการจองจริง)
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { bangkokToDate, todayBangkok } from "../lib/time";
import { dayOfWeek, ymd } from "../lib/thai";

const prisma = new PrismaClient();

const PEOPLE = [
  { name: "สมชาย ใจดี", dept: "ฝ่ายบริหาร", phone: "1101" },
  { name: "สุดา รักงาน", dept: "ฝ่ายบัญชี", phone: "1205" },
  { name: "วิชัย มั่นคง", dept: "ฝ่ายวิศวกรรม", phone: "1318" },
  { name: "นภา สว่างวงศ์", dept: "ฝ่ายบุคคล", phone: "1422" },
  { name: "ประสิทธิ์ เก่งกล้า", dept: "ฝ่ายไอที", phone: "1509" },
  { name: "ลลิดา พูนสุข", dept: "ฝ่ายการตลาด", phone: "1617" },
  { name: "ธนากร ศรีสุข", dept: "ฝ่ายจัดซื้อ", phone: "1733" },
  { name: "อรทัย แก้วมณี", dept: "ฝ่ายกฎหมาย", phone: "1844" },
];

const TITLES = [
  "ประชุมทีมประจำสัปดาห์",
  "ประชุมติดตามโครงการ",
  "สัมภาษณ์ผู้สมัครงาน",
  "อบรมพนักงานใหม่",
  "ประชุมวางแผนงบประมาณ",
  "นำเสนอผลงานไตรมาส",
  "ประชุมร่วมกับผู้รับเหมา",
  "Workshop ออกแบบระบบ",
  "ประชุมคณะกรรมการ",
  "สรุปผลการดำเนินงาน",
  "ประชุมหารือแผนจัดซื้อ",
  "Training การใช้งานระบบใหม่",
];

// ตัวสุ่มแบบกำหนดผลได้ (ผลเหมือนเดิมทุกครั้ง)
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

async function clearMock() {
  const where = {
    title: { in: TITLES },
    bookerName: { in: PEOPLE.map((p) => p.name) },
  };
  // log ที่อ้างอิงการจองต้องลบก่อน (foreign key)
  const ids = (await prisma.booking.findMany({ where, select: { id: true } })).map((b) => b.id);
  await prisma.bookingLog.deleteMany({ where: { bookingId: { in: ids } } });
  const r = await prisma.booking.deleteMany({ where });
  console.log(`ลบข้อมูลตัวอย่าง ${r.count} รายการ`);
}

async function seed(month: string) {
  const [y, m] = month.split("-").map(Number);
  const room = await prisma.room.findFirstOrThrow({ where: { active: true }, orderBy: { id: "asc" } });
  const rand = rng(y * 100 + m);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const slots = [8 * 60, 9 * 60, 10 * 60, 11 * 60, 13 * 60, 14 * 60, 15 * 60, 16 * 60];
  let created = 0;
  let skipped = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const date = ymd(y, m, d);
    const dow = dayOfWeek(date);
    if (dow === 0 || dow === 6) continue; // เสาร์-อาทิตย์ไม่มีประชุม
    const count = Math.floor(rand() * 4); // 0–3 รายการต่อวัน
    const used: [number, number][] = [];
    for (let i = 0; i < count; i++) {
      const start = slots[Math.floor(rand() * slots.length)];
      const len = [60, 60, 90, 120, 180][Math.floor(rand() * 5)];
      const end = Math.min(start + len, 18 * 60);
      if (used.some(([s, e]) => start < e && end > s)) continue;
      used.push([start, end]);
      const p = PEOPLE[Math.floor(rand() * PEOPLE.length)];
      const t = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
      try {
        await prisma.booking.create({
          data: {
            roomId: room.id,
            bookerName: p.name,
            dept: p.dept,
            phone: p.phone,
            title: TITLES[Math.floor(rand() * TITLES.length)],
            startsAt: bangkokToDate(date, t(start)),
            endsAt: bangkokToDate(date, t(end)),
          },
        });
        created++;
      } catch {
        skipped++; // ชนกับการจองจริงที่มีอยู่ ข้ามไป
      }
    }
  }
  console.log(`สร้างข้อมูลตัวอย่างเดือน ${month} จำนวน ${created} รายการ (ข้ามเพราะเวลาชนกับของเดิม ${skipped})`);
}

async function main() {
  if (process.argv.includes("--clear")) return clearMock();
  const arg = process.argv.slice(2).find((a) => /^\d{4}-\d{2}$/.test(a));
  await clearMock(); // กันสร้างซ้ำซ้อนเวลารันหลายครั้ง
  await seed(arg ?? todayBangkok().slice(0, 7));
}

main().finally(() => prisma.$disconnect());
