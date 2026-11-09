import { z } from "zod";
import {
  CLOSE_HOUR,
  MAX_DAYS_AHEAD,
  OPEN_HOUR,
  SLOT_MINUTES,
  addDays,
  bangkokToDate,
  todayBangkok,
} from "./time";

const timeRe = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const bookingSchema = z
  .object({
    roomId: z.coerce.number().int().positive("เลือกห้อง"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "เลือกวันที่"),
    start: z.string().regex(timeRe, "เลือกเวลาเริ่ม"),
    end: z.string().regex(timeRe, "เลือกเวลาสิ้นสุด"),
    bookerName: z.string().trim().min(1, "กรอกชื่อผู้จอง").max(100),
    dept: z.string().trim().max(100).default(""),
    phone: z.string().trim().max(30).default(""),
    title: z.string().trim().min(1, "กรอกหัวข้อประชุม").max(200),
  })
  .superRefine((v, ctx) => {
    const fail = (message: string, path: string) =>
      ctx.addIssue({ code: "custom", message, path: [path] });

    const startsAt = bangkokToDate(v.date, v.start);
    const endsAt = bangkokToDate(v.date, v.end);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      return fail("วันที่ไม่ถูกต้อง", "date");
    }
    if (endsAt <= startsAt) return fail("เวลาสิ้นสุดต้องหลังเวลาเริ่ม", "end");

    const [sh, sm] = v.start.split(":").map(Number);
    const [eh, em] = v.end.split(":").map(Number);
    if (sm % SLOT_MINUTES || em % SLOT_MINUTES) {
      return fail(`เวลาต้องเป็นช่วงละ ${SLOT_MINUTES} นาที`, "start");
    }
    if (sh < OPEN_HOUR || eh * 60 + em > CLOSE_HOUR * 60) {
      return fail(`จองได้เฉพาะเวลา ${OPEN_HOUR}:00–${CLOSE_HOUR}:00 น.`, "start");
    }
    if (v.date > addDays(todayBangkok(), MAX_DAYS_AHEAD)) {
      return fail(`จองล่วงหน้าได้ไม่เกิน ${MAX_DAYS_AHEAD} วัน`, "date");
    }
  });

// ห้ามจอง/ย้ายไปเวลาที่ผ่านมาแล้ว (ตรวจแยกจาก schema เพื่อให้แก้รายละเอียดของการจองที่เริ่มไปแล้วได้)
export function isInPast(date: string, start: string) {
  return bangkokToDate(date, start).getTime() < Date.now();
}

export type BookingInput = z.infer<typeof bookingSchema>;

export const roomSchema = z.object({
  name: z.string().trim().min(1, "กรอกชื่อห้อง").max(100),
  capacity: z.coerce.number().int().min(1, "ความจุต้องมากกว่า 0").max(1000),
  equipment: z.string().trim().max(300).default(""),
});
