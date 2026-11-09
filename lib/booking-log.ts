import "server-only";
import { headers } from "next/headers";
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

// IP ของผู้ใช้: x-client-ip ถูกตั้งทับโดย deploy/ip-header.cjs จาก socket จริง (ปลอมไม่ได้)
// ถ้าไม่มี (เช่น dev) ใช้ค่าสุดท้ายใน x-forwarded-for ซึ่งเป็นค่าที่ proxy (IIS/ARR) ต่อท้ายให้
async function clientIp() {
  const h = await headers();
  const direct = h.get("x-client-ip");
  const fwd = h.get("x-forwarded-for")?.split(",").pop();
  return (direct ?? fwd ?? "").trim().replace(/^::ffff:/, "");
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

// ข้อมูลแถว log (เขียนพร้อมการเปลี่ยนแปลงในธุรกรรมเดียวกัน ดู booking-service)
export type LogData = {
  action: "EDIT" | "CANCEL";
  bookingTitle: string;
  actorName: string;
  actorIp: string;
  changes: string;
};

export async function buildLog(
  action: "EDIT" | "CANCEL",
  booking: { title: string },
  actorName: string,
  changes: Change[] = [],
): Promise<LogData> {
  return {
    action,
    bookingTitle: booking.title,
    actorName: actorName.trim().slice(0, 100),
    actorIp: await clientIp(),
    changes: JSON.stringify(changes),
  };
}
