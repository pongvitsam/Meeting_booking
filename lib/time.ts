import { addDaysYMD, formatThaiDate } from "./thai";

// ประเทศไทยใช้ UTC+7 ตลอดปี (ไม่มี DST) จึงแปลงตรง ๆ ได้
export const TZ = "Asia/Bangkok";
export const OPEN_HOUR = 7;
export const CLOSE_HOUR = 20;
export const SLOT_MINUTES = 15;
export const MAX_DAYS_AHEAD = 60;

/** "2026-11-09" + "09:30" (เวลาไทย) -> Date */
export function bangkokToDate(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+07:00`);
}

/** วันที่ปัจจุบันตามเวลาไทยในรูป YYYY-MM-DD */
export function todayBangkok(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(new Date());
}

export function isValidDateStr(s: string | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

export const addDays = addDaysYMD;

export function fmtTime(d: Date): string {
  return toBangkokParts(d).time;
}

export function fmtDateLong(date: string): string {
  return formatThaiDate(date, { weekday: true });
}

/** Date -> { date: YYYY-MM-DD, time: HH:mm } ตามเวลาไทย */
export function toBangkokParts(d: Date): { date: string; time: string } {
  const date = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return { date, time };
}

export function minutesOfDay(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function timeFromMinutes(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}
