import { fmtTime, toBangkokParts } from "./time";
import { formatThaiDate } from "./thai";

// ข้อมูลการจองที่ส่งให้ฝั่ง client (เป็น string ล้วน ๆ ไม่มีปัญหา timezone/hydration)
export type BookingDTO = {
  id: number;
  title: string;
  date: string; // YYYY-MM-DD
  dateLabel: string; // วันอังคารที่ 10 พฤศจิกายน 2569
  start: string; // 09:00
  end: string;
  roomName: string;
  bookerName: string;
  dept: string;
  phone: string;
};

type BookingRow = {
  id: number;
  title: string;
  startsAt: Date;
  endsAt: Date;
  bookerName: string;
  dept: string;
  phone: string;
};

export function toBookingDTO(b: BookingRow, roomName: string): BookingDTO {
  const { date } = toBangkokParts(b.startsAt);
  return {
    id: b.id,
    title: b.title,
    date,
    dateLabel: formatThaiDate(date, { weekday: true }),
    start: fmtTime(b.startsAt),
    end: fmtTime(b.endsAt),
    roomName,
    bookerName: b.bookerName,
    dept: b.dept,
    phone: b.phone,
  };
}
