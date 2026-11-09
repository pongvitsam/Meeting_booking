import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin-auth";
import { toBangkokParts, fmtTime } from "@/lib/time";
import { formatThaiDate } from "@/lib/thai";
import type { Change } from "@/lib/booking-log";

export const dynamic = "force-dynamic";

function parse(s: string): Change[] {
  try {
    return JSON.parse(s) as Change[];
  } catch {
    return [];
  }
}

export default async function AdminLogs() {
  if (!(await isAdmin())) redirect("/admin/login");
  const logs = await prisma.bookingLog.findMany({ orderBy: { createdAt: "desc" }, take: 300 });

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">ประวัติการแก้ไข / ยกเลิกการจอง</h1>
        <p className="text-sm text-slate-500">{logs.length} รายการล่าสุด · ชื่อผู้ดำเนินการเป็นชื่อที่ผู้ใช้กรอกเอง</p>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">เมื่อ</th>
              <th className="px-4 py-3">การกระทำ</th>
              <th className="px-4 py-3">ผู้ดำเนินการ</th>
              <th className="px-4 py-3">การจอง</th>
              <th className="px-4 py-3">รายละเอียดที่เปลี่ยน</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => {
              const t = toBangkokParts(l.createdAt);
              const changes = parse(l.changes);
              return (
                <tr key={l.id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatThaiDate(t.date, { short: true })} {fmtTime(l.createdAt)} น.
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        l.action === "CANCEL" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {l.action === "CANCEL" ? "ยกเลิก" : "แก้ไข"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{l.actorName}</div>
                    {l.actorIp && <div className="text-xs text-slate-400">IP {l.actorIp}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <Link className="font-medium text-indigo-700 hover:underline" href={`/booking/${l.bookingId}`}>
                      {l.bookingTitle}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {l.action === "CANCEL" ? (
                      <span className="text-slate-500">ยกเลิกการจองทั้งรายการ</span>
                    ) : (
                      <ul className="space-y-0.5">
                        {changes.map((c) => (
                          <li key={c.label}>
                            <span className="text-slate-500">{c.label}:</span>{" "}
                            <span className="text-red-600 line-through">{c.from || "-"}</span> →{" "}
                            <span className="font-medium text-emerald-700">{c.to || "-"}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              );
            })}
            {logs.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">ยังไม่มีประวัติ</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
