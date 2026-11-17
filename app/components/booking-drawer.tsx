"use client";

import Link from "next/link";
import { useEffect } from "react";
import { cancelBookingAction } from "@/lib/actions";
import type { BookingDTO } from "@/lib/booking-dto";
import CancelButton from "./cancel-button";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 border-b border-slate-100 py-3 last:border-0">
      <dt className="w-28 shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className="min-w-0 font-medium break-words text-slate-900">{value || "-"}</dd>
    </div>
  );
}

// แผงรายละเอียดการจองด้านขวา เปิดโดยไม่ต้องเปลี่ยนหน้า
export default function BookingDrawer({
  booking,
  onClose,
  inline = false,
}: {
  booking: BookingDTO | null;
  onClose: () => void;
  // inline: บนจอกว้างวางเป็นแผงข้างปฏิทิน (ไม่ทับ) / จอแคบยังเป็นแผงเลื่อนทับ
  inline?: boolean;
}) {
  useEffect(() => {
    if (!booking) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [booking, onClose]);

  if (!booking) return null;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-900/30 ${inline ? "lg:hidden" : ""}`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-label="รายละเอียดการจอง"
        className={`drawer-in fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl ${
          inline
            ? "lg:sticky lg:top-20 lg:z-10 lg:h-[calc(100vh-6.5rem)] lg:w-96 lg:max-w-none lg:shrink-0 lg:overflow-hidden lg:rounded-2xl lg:border lg:border-slate-200 lg:shadow-lg"
            : "lg:border-l lg:border-slate-200"
        }`}
      >
        <div className="flex items-start gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-white">
          <div className="min-w-0 flex-1">
            <p className="text-sm opacity-80">รายละเอียดการจอง</p>
            <h2 className="text-xl font-bold break-words">{booking.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-2xl leading-none transition hover:bg-white/20"
          >
            ×
          </button>
        </div>

        <dl className="flex-1 overflow-y-auto px-6 py-2">
          <Row label="ห้อง" value={booking.roomName} />
          <Row label="วันที่" value={booking.dateLabel} />
          <Row label="เวลา" value={`${booking.start} – ${booking.end} น.`} />
          <Row label="ผู้จอง" value={booking.bookerName} />
          <Row label="แผนก" value={booking.dept} />
          <Row label="เบอร์ต่อ / โทร" value={booking.phone} />
        </dl>

        <div className="space-y-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <Link href={`/booking/${booking.id}/edit`} className="btn-secondary">แก้ไขการจอง</Link>
            <CancelButton action={cancelBookingAction} id={booking.id} />
          </div>
          <p className="text-xs text-slate-500">ทุกคนแก้ไข/ยกเลิกได้ โดยระบบจะบันทึกชื่อผู้ดำเนินการให้แอดมินตรวจสอบ</p>
        </div>
      </aside>
    </>
  );
}
