import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ระบบนี้มีห้องประชุมห้องเดียว (แก้ชื่อ/ความจุได้ที่หน้าแอดมิน)
  if ((await prisma.room.count()) === 0) {
    await prisma.room.create({
      data: { name: "ห้องประชุม", capacity: 20, equipment: "โปรเจกเตอร์, ไมค์, ไวท์บอร์ด" },
    });
  }
}

main().finally(() => prisma.$disconnect());
