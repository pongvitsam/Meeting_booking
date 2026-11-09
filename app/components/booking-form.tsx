"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import type { FormState } from "@/lib/actions";
import { CLOSE_HOUR, OPEN_HOUR, SLOT_MINUTES, minutesOfDay, timeFromMinutes } from "@/lib/time";
import { formatThaiDate } from "@/lib/thai";
import DatePicker from "./date-picker";

type Room = { id: number; name: string; capacity: number };
type Busy = { id: number; start: string; end: string; title: string; bookerName: string };

export type BookingDefaults = {
  id?: number;
  roomId?: number;
  date: string;
  start: string;
  end: string;
  bookerName?: string;
  dept?: string;
  phone?: string;
  title?: string;
};

const DURATIONS = [
  { label: "30 นาที", min: 30 },
  { label: "1 ชั่วโมง", min: 60 },
  { label: "1.5 ชั่วโมง", min: 90 },
  { label: "2 ชั่วโมง", min: 120 },
  { label: "3 ชั่วโมง", min: 180 },
  { label: "4 ชั่วโมง", min: 240 },
];

export default function BookingForm({
  action,
  rooms,
  defaults,
  submitLabel,
  minDate,
  maxDate,
}: {
  action: (s: FormState, fd: FormData) => Promise<FormState>;
  rooms: Room[];
  defaults: BookingDefaults;
  submitLabel: string;
  minDate: string;
  maxDate: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [roomId, setRoomId] = useState(defaults.roomId ?? rooms[0]?.id);
  const [date, setDate] = useState(defaults.date);
  const [start, setStart] = useState(defaults.start);
  const [end, setEnd] = useState(defaults.end);
  const [loaded, setLoaded] = useState<{ key: string; list: Busy[] } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const fe = state?.fieldErrors ?? {};
  // ถ้าบันทึกไม่สำเร็จ ใช้ค่าที่ผู้ใช้เพิ่งกรอก (React จะรีเซ็ตช่องที่ไม่ได้ควบคุมกลับเป็นค่าเริ่มต้น)
  const val = (k: "title" | "bookerName" | "dept" | "phone") => state?.values?.[k] ?? defaults[k];
  const err = (k: string) => (fe[k] ? <p className="mt-1 text-xs font-medium text-red-600">{fe[k]}</p> : null);

  const open = OPEN_HOUR * 60;
  const close = CLOSE_HOUR * 60;
  const times = useMemo(() => {
    const out: string[] = [];
    for (let m = open; m <= close; m += SLOT_MINUTES) out.push(timeFromMinutes(m));
    return out;
  }, [open, close]);

  const startMin = minutesOfDay(start);
  const endMin = minutesOfDay(end);
  const duration = endMin - startMin;

  // โหลดช่วงเวลาที่ถูกจองแล้วของวันที่/ห้องที่เลือก ทุกครั้งที่เปลี่ยน
  const key = `${roomId}|${date}`;
  useEffect(() => {
    let ignore = false;
    const qs = new URLSearchParams({ date, roomId: String(roomId) });
    if (defaults.id) qs.set("excludeId", String(defaults.id));
    fetch(`/api/availability?${qs}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((list: Busy[]) => {
        if (ignore) return;
        setLoadError(false);
        setLoaded({ key, list });
      })
      .catch(() => !ignore && setLoadError(true));
    return () => {
      ignore = true;
    };
  }, [key, date, roomId, defaults.id]);

  const busy = loaded?.key === key ? loaded.list : null;
  const overlaps = (b: Busy, s: number, e: number) =>
    minutesOfDay(b.start) < e && minutesOfDay(b.end) > s;
  const conflicts = busy ? busy.filter((b) => overlaps(b, startMin, endMin)) : [];
  const startBusy = (t: string) =>
    !!busy && busy.some((b) => overlaps(b, minutesOfDay(t), minutesOfDay(t) + SLOT_MINUTES));

  function changeStart(v: string) {
    setStart(v);
    if (minutesOfDay(end) <= minutesOfDay(v)) {
      setEnd(timeFromMinutes(Math.min(minutesOfDay(v) + 60, close)));
    }
  }
  function applyDuration(min: number) {
    setEnd(timeFromMinutes(Math.min(startMin + min, close)));
  }

  return (
    <form action={formAction} className="card space-y-6 p-5 sm:p-7">
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      {state?.error && <p className="alert-err">{state.error}</p>}

      {rooms.length === 1 ? (
        <>
          <input type="hidden" name="roomId" value={rooms[0].id} />
          <div className="rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
            <span className="font-semibold">{rooms[0].name}</span> · {rooms[0].capacity} ที่นั่ง
          </div>
        </>
      ) : (
        <label className="block">
          <span className="field-label">ห้อง</span>
          <select
            name="roomId"
            value={roomId}
            onChange={(e) => setRoomId(Number(e.target.value))}
            className="input"
          >
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>{r.name} ({r.capacity} ที่นั่ง)</option>
            ))}
          </select>
        </label>
      )}

      <div>
        <span className="field-label">วันที่</span>
        <DatePicker name="date" value={date} onChange={setDate} min={minDate} max={maxDate} />
        {err("date")}
      </div>

      {/* ช่วงเวลาที่ถูกจองแล้วของวันที่เลือก */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="mb-2 text-sm font-semibold text-slate-700">
          ช่วงเวลาที่ถูกจองแล้ว · {formatThaiDate(date, { short: true })}
        </p>
        {loadError ? (
          <p className="text-sm text-amber-700">ตรวจสอบช่วงเวลาที่ถูกจองไม่ได้ในขณะนี้ (ระบบจะตรวจอีกครั้งตอนกดยืนยัน)</p>
        ) : !busy ? (
          <p className="text-sm text-slate-500">กำลังตรวจสอบ…</p>
        ) : busy.length === 0 ? (
          <p className="text-sm font-medium text-emerald-700">✓ ว่างทั้งวัน ยังไม่มีการจอง</p>
        ) : (
          <ul className="space-y-1.5">
            {busy.map((b) => {
              const hit = overlaps(b, startMin, endMin);
              return (
                <li
                  key={b.id}
                  className={`flex flex-wrap items-baseline gap-x-2 rounded-lg px-3 py-1.5 text-sm ${
                    hit ? "bg-red-100 text-red-800 ring-1 ring-red-300" : "bg-white text-slate-700 ring-1 ring-slate-200"
                  }`}
                >
                  <span className="font-bold tabular-nums">{b.start}–{b.end} น.</span>
                  <span className="min-w-0 truncate">{b.title}</span>
                  <span className="text-xs opacity-70">({b.bookerName})</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {conflicts.length > 0 && (
        <div
          key={`${date}-${start}-${end}`}
          role="alert"
          className="shake rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <p className="font-bold">⚠ เวลา {start}–{end} น. ชนกับการจองที่มีอยู่แล้ว</p>
          <ul className="mt-1 list-disc pl-5">
            {conflicts.map((b) => (
              <li key={b.id}>
                {b.start}–{b.end} น. {b.title} ({b.bookerName})
              </li>
            ))}
          </ul>
          <p className="mt-1">กรุณาเลือกเวลาอื่นที่ไม่ซ้อนกับช่วงที่ถูกจองไว้</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="field-label">เวลาเริ่ม</span>
          <select
            name="start"
            value={start}
            onChange={(e) => changeStart(e.target.value)}
            aria-invalid={conflicts.length > 0}
            className={`input ${conflicts.length > 0 ? "!border-red-400 !ring-4 !ring-red-100" : ""}`}
          >
            {times.filter((t) => minutesOfDay(t) < close).map((t) => (
              <option key={t} value={t}>{t} น.{startBusy(t) ? "  (มีการจอง)" : ""}</option>
            ))}
          </select>
          {err("start")}
        </label>
        <label className="block">
          <span className="field-label">เวลาสิ้นสุด</span>
          <select
            name="end"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            aria-invalid={conflicts.length > 0}
            className={`input ${conflicts.length > 0 ? "!border-red-400 !ring-4 !ring-red-100" : ""}`}
          >
            {times.filter((t) => minutesOfDay(t) > startMin).map((t) => (
              <option key={t} value={t}>{t} น.</option>
            ))}
          </select>
          {err("end")}
        </label>
      </div>

      <div>
        <span className="field-label">ระยะเวลา</span>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d.min}
              type="button"
              onClick={() => applyDuration(d.min)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                duration === d.min
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-indigo-50"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="field-label">หัวข้อประชุม</span>
        <input name="title" defaultValue={val("title")} required maxLength={200} placeholder="เช่น ประชุมทีมประจำสัปดาห์" className="input" />
        {err("title")}
      </label>

      <label className="block">
        <span className="field-label">ชื่อผู้จอง</span>
        <input name="bookerName" defaultValue={val("bookerName")} required maxLength={100} className="input" />
        {err("bookerName")}
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">แผนก</span>
          <input name="dept" defaultValue={val("dept")} maxLength={100} placeholder="เช่น ฝ่ายบัญชี" className="input" />
        </label>
        <label className="block">
          <span className="field-label">เบอร์ต่อ / เบอร์โทร</span>
          <input name="phone" type="tel" inputMode="tel" defaultValue={val("phone")} maxLength={30} placeholder="เช่น 1234" className="input" />
        </label>
      </div>

      {defaults.id && (
        <label className="block rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="field-label">ชื่อผู้แก้ไข</span>
          <input
            name="actorName"
            defaultValue={state?.values?.actorName ?? ""}
            required
            maxLength={100}
            placeholder="ชื่อของคุณ (บันทึกลง log ให้แอดมินตรวจสอบ)"
            className="input"
          />
          {err("actorName")}
        </label>
      )}

      <button
        disabled={pending || conflicts.length > 0}
        className="btn-primary w-full py-3 text-base"
      >
        {pending ? "กำลังบันทึก…" : conflicts.length > 0 ? "เวลานี้ถูกจองแล้ว" : submitLabel}
      </button>
    </form>
  );
}
