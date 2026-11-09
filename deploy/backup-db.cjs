// สำรองฐานข้อมูล SQLite ด้วย VACUUM INTO (ได้ไฟล์สำเนาที่สอดคล้องกันแม้เว็บกำลังทำงาน ไม่ต้องติดตั้ง sqlite3)
// ใช้: node backup-db.cjs <โฟลเดอร์ปลายทาง> [จำนวนวันที่เก็บ=30]   (อ่าน DATABASE_URL จาก env)
const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");

const dest = process.argv[2];
const keepDays = Number(process.argv[3]) || 30;
if (!dest) {
  console.error("ระบุโฟลเดอร์ปลายทาง");
  process.exit(1);
}

(async () => {
  fs.mkdirSync(dest, { recursive: true });
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
  const file = path.join(dest, `meeting_booking_${stamp}.db`);
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
  } finally {
    await prisma.$disconnect();
  }
  const limit = Date.now() - keepDays * 86400000;
  for (const f of fs.readdirSync(dest)) {
    const fp = path.join(dest, f);
    if (/^meeting_booking_.*\.db$/.test(f) && fs.statSync(fp).mtimeMs < limit) fs.rmSync(fp);
  }
  console.log(`สำรองแล้ว: ${file}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
