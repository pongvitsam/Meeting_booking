"use client";

import { useEffect, useRef, useState } from "react";
import {
  THAI_DAYS_SHORT,
  formatMonthYear,
  formatThaiDate,
  monthGrid,
  monthOf,
  shiftMonth,
} from "@/lib/thai";

// ปฏิทินเลือกวันที่แบบไทย (พ.ศ. + ชื่อเดือนไทย) ใช้แทน <input type="date"> ที่แสดงเป็น ค.ศ.
export default function DatePicker({
  name,
  value,
  onChange,
  min,
  max,
}: {
  name: string;
  value: string;
  onChange: (date: string) => void;
  min: string;
  max: string;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(monthOf(value));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const weeks = monthGrid(view.y, view.m);
  const prev = shiftMonth(view.y, view.m, -1);
  const next = shiftMonth(view.y, view.m, 1);
  const canPrev = `${prev.y}-${String(prev.m).padStart(2, "0")}-31` >= min;
  const canNext = `${next.y}-${String(next.m).padStart(2, "0")}-01` <= max;

  return (
    <div ref={ref} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => {
          setView(monthOf(value));
          setOpen((o) => !o);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="input flex items-center justify-between gap-2 text-left"
      >
        <span>{formatThaiDate(value)}</span>
        <span aria-hidden>📅</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="เลือกวันที่"
          className="absolute z-40 mt-2 w-[19rem] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              disabled={!canPrev}
              onClick={() => setView(prev)}
              className="grid h-9 w-9 place-items-center rounded-lg text-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30"
              aria-label="เดือนก่อนหน้า"
            >
              ‹
            </button>
            <span className="text-sm font-bold text-slate-800">{formatMonthYear(view.y, view.m)}</span>
            <button
              type="button"
              disabled={!canNext}
              onClick={() => setView(next)}
              className="grid h-9 w-9 place-items-center rounded-lg text-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30"
              aria-label="เดือนถัดไป"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-500">
            {THAI_DAYS_SHORT.map((d, i) => (
              <div key={d} className={`py-1 ${i === 0 ? "text-rose-500" : ""}`}>{d}</div>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7">
              {week.map((c) => {
                const disabled = c.date < min || c.date > max;
                const selected = c.date === value;
                return (
                  <button
                    key={c.date}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      onChange(c.date);
                      setOpen(false);
                    }}
                    className={`m-0.5 grid h-9 place-items-center rounded-full text-sm transition ${
                      selected
                        ? "bg-indigo-600 font-bold text-white shadow"
                        : disabled
                          ? "text-slate-300"
                          : c.inMonth
                            ? `hover:bg-indigo-100 ${c.dow === 0 ? "text-rose-500" : "text-slate-800"}`
                            : "text-slate-400 hover:bg-slate-100"
                    }`}
                  >
                    {c.day}
                  </button>
                );
              })}
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              onChange(min);
              setOpen(false);
            }}
            className="mt-2 w-full rounded-lg py-1.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
          >
            วันนี้
          </button>
        </div>
      )}
    </div>
  );
}
