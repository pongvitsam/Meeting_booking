"use client";

import Link from "next/link";
import { useState } from "react";
import { THAI_DAYS_SHORT, type GridDay } from "@/lib/thai";
import type { BookingDTO } from "@/lib/booking-dto";
import { CHIP } from "@/lib/colors";
import BookingDrawer from "./booking-drawer";

const MAX_CHIPS = 3;

export default function MonthBoard({
  weeks,
  today,
  byDay,
  canBook,
  initialId,
}: {
  weeks: GridDay[][];
  today: string;
  byDay: Record<string, BookingDTO[]>;
  canBook: boolean;
  initialId?: number;
}) {
  const all = Object.values(byDay).flat();
  const [selectedId, setSelectedId] = useState<number | null>(initialId ?? null);
  const selected = all.find((b) => b.id === selectedId) ?? null;
  const close = () => setSelectedId(null);

  return (
    <>
      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {THAI_DAYS_SHORT.map((d, i) => (
            <div
              key={d}
              className={`py-2.5 text-center text-xs font-semibold tracking-wide sm:text-sm ${
                i === 0 ? "text-rose-500" : i === 6 ? "text-indigo-500" : "text-slate-600"
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((cell) => {
              const list = byDay[cell.date] ?? [];
              const isToday = cell.date === today;
              const isPast = cell.date < today;
              return (
                <div
                  key={cell.date}
                  className={`group relative min-h-[5.5rem] border-b border-r border-slate-100 p-1 last:border-r-0 sm:min-h-[8rem] sm:p-1.5 ${
                    cell.inMonth ? (isPast ? "bg-slate-50/70" : "bg-white") : "bg-slate-50"
                  } ${isToday ? "bg-indigo-50/50" : ""}`}
                >
                  <Link
                    href={`/day/${cell.date}`}
                    aria-label={`ดูตารางวันที่ ${cell.day}`}
                    className="absolute inset-0 transition hover:bg-indigo-50/60 focus-visible:outline-2 focus-visible:outline-indigo-400"
                  />
                  <div className="pointer-events-none relative flex items-center justify-between">
                    <span
                      className={`grid h-7 w-7 place-items-center rounded-full text-sm font-semibold ${
                        isToday
                          ? "bg-indigo-600 text-white shadow"
                          : !cell.inMonth
                            ? "text-slate-300"
                            : isPast
                              ? "text-slate-400"
                              : cell.dow === 0
                                ? "text-rose-500"
                                : "text-slate-800"
                      }`}
                    >
                      {cell.day}
                    </span>
                    {!isPast && canBook && (
                      <Link
                        href={`/book?date=${cell.date}`}
                        aria-label="จองวันนี้"
                        className="pointer-events-auto relative z-10 hidden h-6 w-6 place-items-center rounded-full bg-indigo-600 text-sm font-bold text-white opacity-0 shadow transition group-hover:opacity-100 focus:opacity-100 sm:grid"
                      >
                        +
                      </Link>
                    )}
                  </div>

                  <div className="pointer-events-none relative mt-1 hidden space-y-1 sm:block">
                    {list.slice(0, MAX_CHIPS).map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedId(b.id)}
                        title={`${b.start}–${b.end} ${b.title} (${b.bookerName})`}
                        className={`pointer-events-auto relative z-10 block w-full truncate rounded-md px-1.5 py-1 text-left text-xs font-medium transition ${CHIP[b.id % CHIP.length]} ${
                          selectedId === b.id ? "ring-2 ring-indigo-500" : ""
                        }`}
                      >
                        <span className="font-bold">{b.start}</span> {b.title}
                      </button>
                    ))}
                    {list.length > MAX_CHIPS && (
                      <p className="px-1 text-xs font-medium text-slate-500">
                        +{list.length - MAX_CHIPS} รายการ
                      </p>
                    )}
                  </div>

                  {list.length > 0 && (
                    <Link
                      href={`/day/${cell.date}`}
                      className="pointer-events-auto relative z-10 mt-1 inline-block rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white sm:hidden"
                    >
                      {list.length}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <BookingDrawer booking={selected} onClose={close} />
    </>
  );
}
