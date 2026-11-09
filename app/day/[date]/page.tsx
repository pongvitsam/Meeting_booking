import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { toBookingDTO } from "@/lib/booking-dto";
import DayBlocks, { type DayBlock } from "../../components/day-blocks";
import {
  CLOSE_HOUR,
  OPEN_HOUR,
  bangkokToDate,
  minutesOfDay,
  timeFromMinutes,
  toBangkokParts,
  todayBangkok,
} from "@/lib/time";
import { addDaysYMD, formatThaiDate, monthKey, monthOf } from "@/lib/thai";

export const dynamic = "force-dynamic";

const SLOT = 30; // นาทีต่อแถว
const ROW_PX = 40;

export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) notFound();

  const today = todayBangkok();
  const nowMin = date === today ? minutesOfDay(toBangkokParts(new Date()).time) : -1;
  const room = await prisma.room.findFirst({ where: { active: true }, orderBy: { id: "asc" } });
  const bookings = room
    ? await prisma.booking.findMany({
        where: {
          roomId: room.id,
          cancelledAt: null,
          startsAt: { lt: bangkokToDate(addDaysYMD(date, 1), "00:00") },
          endsAt: { gt: bangkokToDate(date, "00:00") },
        },
        orderBy: { startsAt: "asc" },
      })
    : [];

  const open = OPEN_HOUR * 60;
  const close = CLOSE_HOUR * 60;
  const rows = Array.from({ length: (close - open) / SLOT }, (_, i) => open + i * SLOT);
  const m = monthOf(date);

  const blocks: DayBlock[] = [];
  for (const b of bookings) {
    const s0 = Math.max(open, minutesOfDay(toBangkokParts(b.startsAt).time));
    const eParts = toBangkokParts(b.endsAt);
    const e0 = Math.min(close, eParts.date > date ? close : minutesOfDay(eParts.time));
    if (e0 <= s0) continue;
    blocks.push({
      booking: toBookingDTO(b, room!.name),
      top: ((s0 - open) / SLOT) * ROW_PX + 2,
      height: ((e0 - s0) / SLOT) * ROW_PX - 4,
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/?m=${monthKey(m.y, m.m)}`} className="btn-secondary">‹ ปฏิทิน</Link>
        <div className="mx-auto text-center">
          <h1 className="text-xl font-bold sm:text-2xl">{formatThaiDate(date, { weekday: true })}</h1>
          {room && <p className="text-sm text-slate-500">{room.name}</p>}
        </div>
        <Link href={`/day/${addDaysYMD(date, -1)}`} className="btn-secondary !px-3.5" aria-label="วันก่อนหน้า">‹</Link>
        <Link href={`/day/${addDaysYMD(date, 1)}`} className="btn-secondary !px-3.5" aria-label="วันถัดไป">›</Link>
      </div>

      {!room ? (
        <p className="card p-6 text-center text-slate-500">ยังไม่มีห้องประชุม ให้แอดมินเพิ่มห้องก่อน</p>
      ) : (
        <div className="card overflow-hidden">
          <div className="border-b bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
            คลิกช่องว่างเพื่อจองเริ่มตั้งแต่เวลานั้น · ช่องที่ผ่านมาแล้วจะจองไม่ได้
          </div>
          <div className="relative" style={{ height: rows.length * ROW_PX }}>
            {rows.map((min) => {
              const isPast =
                date < today || (date === today && min + SLOT <= nowMin);
              const full = min % 60 === 0;
              const time = timeFromMinutes(min);
              const end = timeFromMinutes(Math.min(min + 60, close));
              return (
                <div
                  key={min}
                  className={`flex border-slate-100 ${full ? "border-t border-slate-200" : "border-t border-dashed"}`}
                  style={{ height: ROW_PX }}
                >
                  <div className="w-16 shrink-0 pr-2 pt-1 text-right text-xs font-medium text-slate-400 sm:w-20 sm:text-sm">
                    {full ? `${time} น.` : ""}
                  </div>
                  {isPast ? (
                    <div className="flex-1 border-l border-slate-200 bg-slate-50" />
                  ) : (
                    <Link
                      href={`/book?date=${date}&start=${time}&end=${end}`}
                      title={`จองเริ่ม ${time} น.`}
                      className="group flex-1 border-l border-slate-200 transition hover:bg-indigo-50"
                    >
                      <span className="ml-3 hidden text-xs font-semibold text-indigo-600 group-hover:inline">
                        + จองเริ่ม {time} น.
                      </span>
                    </Link>
                  )}
                </div>
              );
            })}

            {nowMin >= open && nowMin <= close && (
              <div
                className="pointer-events-none absolute right-0 left-16 z-20 flex items-center sm:left-20"
                style={{ top: ((nowMin - open) / SLOT) * ROW_PX }}
              >
                <span className="-ml-1.5 h-3 w-3 rounded-full bg-rose-500" />
                <span className="h-0.5 flex-1 bg-rose-500" />
              </div>
            )}

            <DayBlocks blocks={blocks} />
          </div>
        </div>
      )}
    </div>
  );
}
