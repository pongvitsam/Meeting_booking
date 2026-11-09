import "server-only";
import { headers } from "next/headers";
import { prisma } from "./db";
import { fmtTime, toBangkokParts } from "./time";
import { formatThaiDate } from "./thai";
import type { BookingInput } from "./validators";

export type Change = { label: string; from: string; to: string };

type Row = {
  id: number;
  title: string;
  bookerName: string;
  dept: string;
  phone: string;
  startsAt: Date;
  endsAt: Date;
};

async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim();
}

// เทียบข้อมูลเดิมกับข้อมูลใหม่ คืนเฉพาะช่องที่เปลี่ยน
export function diffBooking(old: Row, next: BookingInput): Change[] {
  const d = toBangkokParts(old.startsAt).date;
  const pairs: [string, string, string][] = [
    ["หัวข้อ", old.title, next.title],
    ["วันที่", formatThaiDate(d, { short: true }), formatThaiDate(next.date, { short: true })],
    ["เวลาเริ่ม", fmtTime(old.startsAt), next.start],
    ["เวลาสิ้นสุด", fmtTime(old.endsAt), next.end],
    ["ผู้จอง", old.bookerName, next.bookerName],
    ["แผนก", old.dept, next.dept],
    ["เบอร์ต่อ", old.phone, next.phone],
  ];
  return pairs.filter(([, a, b]) => a !== b).map(([label, from, to]) => ({ label, from, to }));
}

export async function writeLog(
  action: "EDIT" | "CANCEL",
  booking: { id: number; title: string },
  actorName: string,
  changes: Change[] = [],
) {
  await prisma.bookingLog.create({
    data: {
      bookingId: booking.id,
      action,
      actorName: actorName.trim().slice(0, 100),
      actorIp: await clientIp(),
      bookingTitle: booking.title,
      changes: JSON.stringify(changes),
    },
  });
}
