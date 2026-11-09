import { prisma } from "@/lib/db";
import { createBookingAction } from "@/lib/actions";
import { MAX_DAYS_AHEAD, addDays, isValidDateStr, todayBangkok } from "@/lib/time";
import BookingForm from "../components/booking-form";

export const dynamic = "force-dynamic";

const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; start?: string; end?: string }>;
}) {
  const sp = await searchParams;
  const rooms = await prisma.room.findMany({ where: { active: true }, orderBy: { id: "asc" } });
  const today = todayBangkok();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">จองห้องประชุม</h1>
        <p className="text-sm text-slate-500">กรอกรายละเอียดแล้วกดยืนยัน ไม่ต้องรออนุมัติ</p>
      </div>
      {rooms.length === 0 ? (
        <p className="card p-6 text-center text-slate-500">ยังไม่มีห้องประชุม ให้แอดมินเพิ่มห้องก่อน</p>
      ) : (
        <BookingForm
          action={createBookingAction}
          rooms={rooms}
          minDate={today}
          maxDate={addDays(today, MAX_DAYS_AHEAD)}
          defaults={{
            roomId: rooms[0].id,
            date: isValidDateStr(sp.date) && sp.date >= today ? sp.date : today,
            start: sp.start && timeRe.test(sp.start) ? sp.start : "09:00",
            end: sp.end && timeRe.test(sp.end) ? sp.end : "10:00",
          }}
          submitLabel="ยืนยันการจอง"
        />
      )}
    </div>
  );
}
