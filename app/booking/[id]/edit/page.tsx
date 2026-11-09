import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { updateBookingAction } from "@/lib/actions";
import { MAX_DAYS_AHEAD, addDays, toBangkokParts, todayBangkok } from "@/lib/time";
import BookingForm from "../../../components/booking-form";

export const dynamic = "force-dynamic";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const n = Number((await params).id);
  if (!Number.isInteger(n)) notFound();
  const b = await prisma.booking.findUnique({ where: { id: n } });
  if (!b || b.cancelledAt) notFound();
  const rooms = await prisma.room.findMany({ where: { active: true }, orderBy: { id: "asc" } });
  const s = toBangkokParts(b.startsAt);
  const e = toBangkokParts(b.endsAt);
  const today = todayBangkok();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold">แก้ไขการจอง</h1>
      <BookingForm
        action={updateBookingAction}
        rooms={rooms}
        minDate={s.date < today ? s.date : today}
        maxDate={addDays(today, MAX_DAYS_AHEAD)}
        defaults={{
          id: b.id,
          roomId: b.roomId,
          date: s.date,
          start: s.time,
          end: e.time,
          bookerName: b.bookerName,
          dept: b.dept,
          phone: b.phone,
          title: b.title,
        }}
        submitLabel="บันทึกการแก้ไข"
      />
    </div>
  );
}
