"use client";

import { useActionState } from "react";
import { adminLoginAction } from "@/lib/actions";

export default function AdminLogin() {
  const [state, action, pending] = useActionState(adminLoginAction, undefined);
  return (
    <form action={action} className="card mx-auto mt-10 max-w-sm space-y-5 p-7">
      <div className="text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-2xl">🔒</div>
        <h1 className="text-xl font-bold">เข้าสู่ระบบแอดมิน</h1>
      </div>
      {state?.error && <p className="alert-err">{state.error}</p>}
      <label className="block">
        <span className="field-label">รหัสผ่านแอดมิน</span>
        <input name="password" type="password" required autoFocus className="input" />
      </label>
      <button disabled={pending} className="btn-primary w-full">เข้าสู่ระบบ</button>
    </form>
  );
}
