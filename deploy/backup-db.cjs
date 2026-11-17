// สำรองฐานข้อมูล SQLite ด้วย VACUUM INTO (ได้ไฟล์สำเนาที่สอดคล้องกันแม้เว็บกำลังทำงาน ไม่ต้องติดตั้ง sqlite3)
// แล้วตรวจไฟล์สำรองด้วย PRAGMA integrity_check ถ้าเสียจะลบทิ้งและจบด้วย exit code 1
// ใช้: node backup-db.cjs <โฟลเดอร์ปลายทาง> [จำนวนวันที่เก็บ=30] [ป้ายชื่อ]   (อ่าน DATABASE_URL จาก env)
// บรรทัดสุดท้ายที่พิมพ์คือ path ของไฟล์สำรอง (ให้สคริปต์อื่นนำไปใช้ต่อ)
const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");

const dest = process.argv[2];
const keepDays = Number(process.argv[3]) || 30;
const label = (process.argv[4] || "").replace(/[^A-Za-z0-9._-]/g, "");
if (!dest) {
  console.error("ระบุโฟลเดอร์ปลายทาง");
  process.exit(1);
}

async function verify(file) {
  if (!fs.existsSync(file) || fs.statSync(file).size === 0) throw new Error("ไฟล์สำรองว่างหรือไม่ถูกสร้าง");
  const url = "file:" + file.replace(/\\/g, "/");
  const check = new PrismaClient({ datasources: { db: { url } } });
  try {
    const rows = await check.$queryRawUnsafe("PRAGMA integrity_check");
    const result = rows[0] && Object.values(rows[0])[0];
    if (result !== "ok") throw new Error(`integrity_check ไม่ผ่าน: ${result}`);
  } finally {
    await check.$disconnect();
  }
}

(async () => {
  fs.mkdirSync(dest, { recursive: true });
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  const file = path.join(dest, `meeting_booking_${label ? label + "_" : ""}${stamp}.db`);
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
  } finally {
    await prisma.$disconnect();
  }
  try {
    await verify(file);
  } catch (e) {
    fs.rmSync(file, { force: true });
    throw e;
  }
  const limit = Date.now() - keepDays * 86400000;
  for (const f of fs.readdirSync(dest)) {
    const fp = path.join(dest, f);
    if (/^meeting_booking_.*\.db$/.test(f) && fs.statSync(fp).mtimeMs < limit) fs.rmSync(fp);
  }
  console.log(file);
})().catch((e) => {
  console.error("สำรองล้มเหลว:", e.message || e);
  process.exit(1);
});
