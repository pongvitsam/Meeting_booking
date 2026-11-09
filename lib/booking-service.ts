import { prisma } from "./db";
import { bangkokToDate } from "./time";
import type { BookingInput } from "./validators";

export class OverlapError extends Error {
  constructor() {
    super("ช่วงเวลานี้ถูกจองแล้ว กรุณาเลือกเวลาอื่น");
  }
}

// SQLite trigger (RAISE ABORT) ถูก Prisma แปลงเป็น error ทั่วไป (เช่น "Foreign key constraint violated")
// จึงไม่เชื่อข้อความ error แต่ตรวจซ้ำว่ามีการจองที่ซ้อนทับอยู่จริงหรือไม่
async function hasOverlap(roomId: number, startsAt: Date, endsAt: Date, excludeId?: number) {
  const n = await prisma.booking.count({
    where: {
      roomId,
      cancelledAt: null,
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  return n > 0;
}

async function assertRoom(roomId: number) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room || !room.active) throw new Error("ไม่พบห้องหรือห้องปิดใช้งาน");
}

export async function createBooking(input: BookingInput) {
  await assertRoom(input.roomId);
  const startsAt = bangkokToDate(input.date, input.start);
  const endsAt = bangkokToDate(input.date, input.end);
  try {
    return await prisma.booking.create({
      data: {
        roomId: input.roomId,
        bookerName: input.bookerName,
        dept: input.dept,
        phone: input.phone,
        title: input.title,
        startsAt,
        endsAt,
      },
    });
  } catch (e) {
    if (await hasOverlap(input.roomId, startsAt, endsAt)) throw new OverlapError();
    throw e;
  }
}

export async function updateBooking(id: number, input: BookingInput) {
  await assertRoom(input.roomId);
  const startsAt = bangkokToDate(input.date, input.start);
  const endsAt = bangkokToDate(input.date, input.end);
  try {
    return await prisma.booking.update({
      where: { id },
      data: {
        roomId: input.roomId,
        bookerName: input.bookerName,
        dept: input.dept,
        phone: input.phone,
        title: input.title,
        startsAt,
        endsAt,
      },
    });
  } catch (e) {
    if (await hasOverlap(input.roomId, startsAt, endsAt, id)) throw new OverlapError();
    throw e;
  }
}

export async function cancelBooking(id: number) {
  await prisma.booking.update({ where: { id }, data: { cancelledAt: new Date() } });
}
