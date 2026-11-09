import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin-auth";
import { adminCancelAction } from "@/lib/actions";
import { fmtTime, toBangkokParts } from "@/lib/time";
import { formatThaiDate } from "@/lib/thai";
import CancelButton from "../../components/cancel-button";

export const dynamic = "force-dynamic";

export default async function AdminBookings() {
  if (!(await isAdmin())) redirect("/admin/login");
  const bookings = await prisma.booking.findMany({
    where: { cancelledAt: null, endsAt: { gte: new Date() } },
    include: { room: true },
    orderBy: { startsAt: "asc" },
    take: 200,
  });
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">การจองที่กำลังจะมาถึง</h1>
        <p className="text-sm text-slate-500">{bookings.length} รายการ</p>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">วันที่</th>
              <th className="px-4 py-3">เวลา</th>
              <th className="px-4 py-3">หัวข้อ</th>
              <th className="px-4 py-3">ผู้จอง</th>
              <th className="px-4 py-3">แผนก</th>
              <th className="px-4 py-3">เบอร์ต่อ</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                <td className="px-4 py-3 whitespace-nowrap">{formatThaiDate(toBangkokParts(b.startsAt).date, { short: true })}</td>
                <td className="px-4 py-3 whitespace-nowrap">{fmtTime(b.startsAt)}–{fmtTime(b.endsAt)}</td>
                <td className="px-4 py-3">
                  <Link className="font-medium text-indigo-700 hover:underline" href={`/booking/${b.id}`}>{b.title}</Link>
                </td>
                <td className="px-4 py-3">{b.bookerName}</td>
                <td className="px-4 py-3">{b.dept || "-"}</td>
                <td className="px-4 py-3">{b.phone || "-"}</td>
                <td className="px-4 py-3 text-right">
                  <CancelButton action={adminCancelAction} id={b.id} label="ยกเลิก" />
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">ไม่มีการจอง</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
