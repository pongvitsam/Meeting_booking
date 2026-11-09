import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin-auth";
import { toggleRoomAction } from "@/lib/actions";
import RoomForm from "../room-form";

export const dynamic = "force-dynamic";

export default async function AdminRooms({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");
  const sp = await searchParams;
  const rooms = await prisma.room.findMany({ orderBy: { id: "asc" } });
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">ตั้งค่าห้องประชุม</h1>
        <p className="text-sm text-slate-500">ระบบแสดงห้องที่เปิดใช้งานห้องแรกในปฏิทิน</p>
      </div>
      {sp.saved && <p className="alert-ok">บันทึกเรียบร้อยแล้ว</p>}
      {rooms.map((r) => (
        <div key={r.id} className={`card space-y-3 p-5 ${r.active ? "" : "opacity-60"}`}>
          <RoomForm room={r} />
          <form action={toggleRoomAction}>
            <input type="hidden" name="id" value={r.id} />
            <button className="text-sm font-medium text-slate-500 underline hover:text-slate-800">
              {r.active ? "ปิดใช้งานห้องนี้" : "เปิดใช้งานห้องนี้"}
            </button>
          </form>
        </div>
      ))}
      <details className="card p-5">
        <summary className="cursor-pointer font-semibold text-indigo-700">+ เพิ่มห้องใหม่</summary>
        <div className="mt-4"><RoomForm /></div>
      </details>
    </div>
  );
}
