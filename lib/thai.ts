// ฟังก์ชันวันที่แบบไทย (พ.ศ., ชื่อเดือนไทย) ใช้ได้ทั้งฝั่ง server และ client
// วันที่ทั้งหมดอยู่ในรูป "YYYY-MM-DD" (ค.ศ. ภายใน) แล้วแปลงเป็น พ.ศ. ตอนแสดงผลเท่านั้น

export const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
export const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];
export const THAI_DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
export const THAI_DAYS_SHORT = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

const pad = (n: number) => String(n).padStart(2, "0");

export function toBE(year: number) {
  return year + 543;
}

export function parseYMD(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return { y, m, d };
}

export function ymd(y: number, m: number, d: number) {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function dayOfWeek(s: string) {
  const { y, m, d } = parseYMD(s);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDaysYMD(s: string, n: number) {
  const { y, m, d } = parseYMD(s);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return ymd(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

export function monthOf(s: string) {
  const { y, m } = parseYMD(s);
  return { y, m };
}

export function shiftMonth(y: number, m: number, delta: number) {
  const t = new Date(Date.UTC(y, m - 1 + delta, 1));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1 };
}

export function monthKey(y: number, m: number) {
  return `${y}-${pad(m)}`;
}

/** "พฤศจิกายน 2569" */
export function formatMonthYear(y: number, m: number) {
  return `${THAI_MONTHS[m - 1]} ${toBE(y)}`;
}

/** "10 พฤศจิกายน 2569" หรือ "วันอังคารที่ 10 พฤศจิกายน 2569" (weekday) หรือ "10 พ.ย. 69" (short) */
export function formatThaiDate(s: string, opt: { weekday?: boolean; short?: boolean } = {}) {
  const { y, m, d } = parseYMD(s);
  if (opt.short) return `${d} ${THAI_MONTHS_SHORT[m - 1]} ${String(toBE(y)).slice(-2)}`;
  const base = `${d} ${THAI_MONTHS[m - 1]} ${toBE(y)}`;
  return opt.weekday ? `วัน${THAI_DAYS[dayOfWeek(s)]}ที่ ${base}` : base;
}

export type GridDay = { date: string; day: number; inMonth: boolean; dow: number };

/** ตารางเดือน แถวละ 7 วัน เริ่มวันอาทิตย์ (ครบ 5–6 สัปดาห์) */
export function monthGrid(y: number, m: number): GridDay[][] {
  const first = ymd(y, m, 1);
  const start = addDaysYMD(first, -dayOfWeek(first));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const total = Math.ceil((dayOfWeek(first) + daysInMonth) / 7) * 7;
  const weeks: GridDay[][] = [];
  for (let i = 0; i < total; i++) {
    const date = addDaysYMD(start, i);
    const p = parseYMD(date);
    const cell = { date, day: p.d, inMonth: p.m === m, dow: i % 7 };
    if (i % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1].push(cell);
  }
  return weeks;
}
