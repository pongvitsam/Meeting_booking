"use client";

import { useActionState } from "react";
import { saveRoomAction } from "@/lib/actions";

export default function RoomForm({
  room,
}: {
  room?: { id: number; name: string; capacity: number; equipment: string };
}) {
  const [state, action, pending] = useActionState(saveRoomAction, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_7rem_1.5fr_auto] sm:items-end">
      {room && <input type="hidden" name="id" value={room.id} />}
      <label className="block">
        <span className="field-label">ชื่อห้อง</span>
        <input name="name" defaultValue={room?.name} required className="input" />
      </label>
      <label className="block">
        <span className="field-label">ที่นั่ง</span>
        <input name="capacity" type="number" min={1} defaultValue={room?.capacity} required className="input" />
      </label>
      <label className="block">
        <span className="field-label">อุปกรณ์</span>
        <input name="equipment" defaultValue={room?.equipment} className="input" />
      </label>
      <button disabled={pending} className="btn-primary">{room ? "บันทึก" : "เพิ่มห้อง"}</button>
      {state?.error && <p className="alert-err sm:col-span-4">{state.error}</p>}
    </form>
  );
}
