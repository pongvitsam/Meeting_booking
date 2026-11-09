// สร้างห้องประชุมเริ่มต้นถ้ายังไม่มีห้องเลย (ใช้ตอนติดตั้งครั้งแรก รันซ้ำได้ปลอดภัย)
// ใช้: node init-db.cjs "ชื่อห้อง" 20
const { PrismaClient } = require("@prisma/client");

(async () => {
  const prisma = new PrismaClient();
  try {
    if ((await prisma.room.count()) === 0) {
      const name = process.argv[2] || "ห้องประชุม";
      const capacity = Number(process.argv[3]) || 20;
      await prisma.room.create({ data: { name, capacity, equipment: "" } });
      console.log(`สร้างห้อง "${name}" (${capacity} ที่นั่ง)`);
    } else {
      console.log("มีห้องอยู่แล้ว ข้ามขั้นตอนนี้");
    }
  } finally {
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
