import Link from "next/link";
import { prisma } from "@/lib/db";
import { toBookingDTO, type BookingDTO } from "@/lib/booking-dto";
import { bangkokToDate, toBangkokParts, todayBangkok } from "@/lib/time";
import {
  addDaysYMD,
  formatMonthYear,
  monthGrid,
  monthKey,
  monthOf,
  shiftMonth,
} from "@/lib/thai";
import MonthBoard from "./components/month-board";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; b?: string; cancelled?: string; created?: string; updated?: string }>;
}) {
  const sp = await searchParams;
  const today = todayBangkok();
  const cur = /^\d{4}-\d{2}$/.test(sp.m ?? "")
    ? { y: Number(sp.m!.slice(0, 4)), m: Number(sp.m!.slice(5, 7)) }
    : monthOf(today);
  const valid = cur.m >= 1 && cur.m <= 12 && cur.y > 2000 && cur.y < 2200;
  const { y, m } = valid ? cur : monthOf(today);

  const weeks = monthGrid(y, m);
  const gridStart = weeks[0][0].date;
  const gridEnd = weeks[weeks.length - 1][6].date;

  const room = await prisma.room.findFirst({ where: { active: true }, orderBy: { id: "asc" } });
  const bookings = room
    ? await prisma.booking.findMany({
        where: {
          roomId: room.id,
          cancelledAt: null,
          startsAt: { gte: bangkokToDate(gridStart, "00:00"), lt: bangkokToDate(addDaysYMD(gridEnd, 1), "00:00") },
        },
        orderBy: { startsAt: "asc" },
      })
    : [];

  const byDay: Record<string, BookingDTO[]> = {};
  for (const b of bookings) {
    const dto = toBookingDTO(b, room!.name);
    (byDay[dto.date] ??= []).push(dto);
  }

  const prev = shiftMonth(y, m, -1);
  const next = shiftMonth(y, m, 1);
  const monthTotal = bookings.filter((b) => {
    const p = monthOf(toBangkokParts(b.startsAt).date);
    return p.y === y && p.m === m;
  }).length;
  const initialId = Number(sp.b) || undefined;

  return (
    <div className="space-y-4">
      {sp.cancelled && <p className="alert-ok">ยกเลิกการจองเรียบร้อยแล้ว</p>}
      {sp.created && <p className="alert-ok">จองสำเร็จแล้ว 🎉 คลิกที่การจองในปฏิทินเพื่อดูรายละเอียด แก้ไข หรือยกเลิกได้</p>}
      {sp.updated && <p className="alert-ok">แก้ไขการจองเรียบร้อยแล้ว</p>}

      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {formatMonthYear(y, m)}
          </h1>
          <p className="text-sm text-slate-500">
            {room ? (
              <>
                {room.name} · {room.capacity} ที่นั่ง{room.equipment ? ` · ${room.equipment}` : ""} ·{" "}
                <span className="font-medium text-indigo-700">เดือนนี้มี {monthTotal} การจอง</span>
              </>
            ) : (
              "ยังไม่มีห้องประชุม"
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            href={`/?m=${monthKey(prev.y, prev.m)}`}
            aria-label="เดือนก่อนหน้า"
            className="btn-secondary !px-3.5 text-lg leading-none"
          >
            ‹
          </Link>
          <Link href="/" className="btn-secondary">วันนี้</Link>
          <Link
            href={`/?m=${monthKey(next.y, next.m)}`}
            aria-label="เดือนถัดไป"
            className="btn-secondary !px-3.5 text-lg leading-none"
          >
            ›
          </Link>
        </div>
        <Link href="/book" className="btn-primary">+ จองห้องประชุม</Link>
      </div>

      <MonthBoard weeks={weeks} today={today} byDay={byDay} canBook={!!room} initialId={initialId} />

      <p className="text-center text-sm text-slate-500">
        คลิกรายการจองเพื่อดูรายละเอียด · คลิกวันที่เพื่อดูตารางเวลาและเลือกช่วงเวลาที่ต้องการจอง
      </p>
    </div>
  );
}
