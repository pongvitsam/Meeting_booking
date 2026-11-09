import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { cancelBookingAction } from "@/lib/actions";
import { fmtTime, toBangkokParts } from "@/lib/time";
import { formatThaiDate } from "@/lib/thai";
import CancelButton from "../../components/cancel-button";

export const dynamic = "force-dynamic";

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; updated?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const n = Number(id);
  if (!Number.isInteger(n)) notFound();
  const b = await prisma.booking.findUnique({ where: { id: n }, include: { room: true } });
  if (!b) notFound();
  const { date } = toBangkokParts(b.startsAt);
  const day = date.slice(0, 7);

  const row = (k: string, v: string) => (
    <div className="flex gap-4 border-b border-slate-100 py-3 last:border-0">
      <dt className="w-32 shrink-0 text-sm text-slate-500">{k}</dt>
      <dd className="font-medium text-slate-900">{v}</dd>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {sp.created && <p className="alert-ok">จองสำเร็จแล้ว 🎉 คลิกที่การจองในปฏิทินเพื่อดูรายละเอียด แก้ไข หรือยกเลิกได้</p>}
      {sp.updated && <p className="alert-ok">แก้ไขการจองเรียบร้อยแล้ว</p>}

      <div className="card overflow-hidden">
        <div className={`px-6 py-5 text-white ${b.cancelledAt ? "bg-slate-500" : "bg-gradient-to-r from-indigo-600 to-violet-600"}`}>
          <p className="text-sm opacity-80">{b.cancelledAt ? "ยกเลิกแล้ว" : "รายละเอียดการจอง"}</p>
          <h1 className="text-2xl font-bold">{b.title}</h1>
        </div>
        <dl className="px-6 py-2">
          {row("ห้อง", b.room.name)}
          {row("วันที่", formatThaiDate(date, { weekday: true }))}
          {row("เวลา", `${fmtTime(b.startsAt)} – ${fmtTime(b.endsAt)} น.`)}
          {row("ผู้จอง", b.bookerName)}
          {row("แผนก", b.dept || "-")}
          {row("เบอร์ต่อ / เบอร์โทร", b.phone || "-")}
        </dl>
      </div>

      {!b.cancelledAt && (
        <div className="card flex flex-wrap items-center gap-3 p-4">
          <Link href={`/booking/${b.id}/edit`} className="btn-secondary">แก้ไขการจอง</Link>
          <CancelButton action={cancelBookingAction} id={b.id} />
        </div>
      )}

      <Link href={`/day/${date}`} className="inline-block text-sm font-medium text-indigo-700 hover:underline">
        ← ดูตารางวันนี้
      </Link>{" "}
      <Link href={`/?m=${day}`} className="inline-block text-sm font-medium text-indigo-700 hover:underline">
        · กลับไปปฏิทิน
      </Link>
    </div>
  );
}
