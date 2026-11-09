import Link from "next/link";
import { prisma } from "@/lib/db";
import { getOwnedIds } from "@/lib/ownership";
import { cancelBookingAction } from "@/lib/actions";
import { fmtTime, toBangkokParts } from "@/lib/time";
import { formatThaiDate } from "@/lib/thai";
import CancelButton from "../components/cancel-button";

export const dynamic = "force-dynamic";

export default async function MyBookings() {
  const ids = await getOwnedIds();
  const bookings = ids.length
    ? await prisma.booking.findMany({
        where: { id: { in: ids }, cancelledAt: null, endsAt: { gte: new Date() } },
        include: { room: true },
        orderBy: { startsAt: "asc" },
      })
    : [];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">การจองของฉัน</h1>
        <p className="text-sm text-slate-500">แสดงการจองที่ทำจากเบราว์เซอร์นี้ และยังไม่ถึงเวลา</p>
      </div>
      {bookings.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="mb-4 text-slate-500">ยังไม่มีการจองที่กำลังจะมาถึง</p>
          <Link href="/book" className="btn-primary">+ จองห้องประชุม</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {bookings.map((b) => {
            const { date } = toBangkokParts(b.startsAt);
            return (
              <li key={b.id} className="card flex flex-wrap items-center gap-4 p-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-indigo-50 text-center leading-tight text-indigo-700">
                  <span className="text-xl font-bold">{Number(date.slice(8))}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/booking/${b.id}`} className="block truncate font-semibold text-slate-900 hover:text-indigo-700">
                    {b.title}
                  </Link>
                  <p className="text-sm text-slate-500">
                    {formatThaiDate(date, { weekday: true })} · {fmtTime(b.startsAt)}–{fmtTime(b.endsAt)} น.
                  </p>
                </div>
                <Link href={`/booking/${b.id}/edit`} className="btn-secondary">แก้ไข</Link>
                <CancelButton action={cancelBookingAction} id={b.id} label="ยกเลิก" />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
