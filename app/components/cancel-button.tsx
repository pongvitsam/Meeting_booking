"use client";

import { useEffect, useRef, useState } from "react";

const KEY = "mb_actor_name";

// ถามชื่อผู้ยกเลิกในหน้าเว็บเอง (ไม่ใช้ prompt()/confirm() ของเบราว์เซอร์ เพราะบางเบราว์เซอร์ไม่รองรับ)
// ชื่อจะถูกบันทึกลง log ให้แอดมินตรวจสอบ
export default function CancelButton({
  action,
  id,
  label = "ยกเลิกการจอง",
}: {
  action: (fd: FormData) => void | Promise<void>;
  id: number;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function show() {
    let last = "";
    try {
      last = localStorage.getItem(KEY) ?? "";
    } catch {}
    setName(last);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", esc, true);
    return () => document.removeEventListener("keydown", esc, true);
  }, [open]);

  const trimmed = name.trim();

  return (
    <>
      <button type="button" className="btn-danger" onClick={show}>
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-900/50 p-4" onClick={() => setOpen(false)}>
          <form
            role="alertdialog"
            aria-label="ยืนยันยกเลิกการจอง"
            action={action}
            onClick={(e) => e.stopPropagation()}
            onSubmit={() => {
              setPending(true);
              try {
                localStorage.setItem(KEY, trimmed);
              } catch {}
            }}
            className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div>
              <h3 className="text-lg font-bold text-slate-900">ยืนยันยกเลิกการจองนี้?</h3>
              <p className="mt-1 text-sm text-slate-500">
                ระบบจะบันทึกชื่อของคุณไว้ให้แอดมินตรวจสอบ
              </p>
            </div>
            <input type="hidden" name="id" value={id} />
            <label className="block">
              <span className="field-label">ชื่อผู้ยกเลิก</span>
              <input
                ref={inputRef}
                name="actorName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
                placeholder="ชื่อของคุณ"
                className="input"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
                ไม่ยกเลิก
              </button>
              <button className="btn-danger" disabled={!trimmed || pending}>
                {pending ? "กำลังยกเลิก…" : "ยืนยันยกเลิก"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
