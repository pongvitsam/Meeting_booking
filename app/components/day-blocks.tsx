"use client";

import { useState } from "react";
import type { BookingDTO } from "@/lib/booking-dto";
import { BLOCK } from "@/lib/colors";
import BookingDrawer from "./booking-drawer";

export type DayBlock = { booking: BookingDTO; top: number; height: number };

export default function DayBlocks({ blocks }: { blocks: DayBlock[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = blocks.find((b) => b.booking.id === selectedId)?.booking ?? null;
  const close = () => setSelectedId(null);

  return (
    <>
      {blocks.map(({ booking: b, top, height }) => (
        <button
          key={b.id}
          type="button"
          onClick={() => setSelectedId(b.id)}
          className={`absolute right-2 left-[4.5rem] z-10 overflow-hidden rounded-xl border-l-4 px-3 py-1.5 text-left shadow-sm transition hover:shadow-md sm:left-[5.5rem] ${BLOCK[b.id % BLOCK.length]} ${
            selectedId === b.id ? "ring-2 ring-indigo-500" : ""
          }`}
          style={{ top, height }}
        >
          <div className="truncate text-sm font-bold">{b.title}</div>
          {height >= 44 && (
            <div className="truncate text-xs opacity-80">
              {b.start}–{b.end} น. · {b.bookerName}
              {b.dept ? ` · ${b.dept}` : ""}
              {b.phone ? ` · โทร ${b.phone}` : ""}
            </div>
          )}
        </button>
      ))}
      <BookingDrawer booking={selected} onClose={close} />
    </>
  );
}
