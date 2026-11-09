import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bangkokToDate, fmtTime } from "@/lib/time";
import { addDaysYMD } from "@/lib/thai";

export const dynamic = "force-dynamic";

// ช่วงเวลาที่ถูกจองแล้วของห้องหนึ่งในวันหนึ่ง (ข้อมูลชุดเดียวกับที่เห็นในปฏิทินอยู่แล้ว)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date") ?? "";
  const roomId = Number(url.searchParams.get("roomId"));
  const excludeId = Number(url.searchParams.get("excludeId")) || undefined;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || !Number.isInteger(roomId)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const rows = await prisma.booking.findMany({
    where: {
      roomId,
      cancelledAt: null,
      startsAt: { lt: bangkokToDate(addDaysYMD(date, 1), "00:00") },
      endsAt: { gt: bangkokToDate(date, "00:00") },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    orderBy: { startsAt: "asc" },
  });

  return NextResponse.json(
    rows.map((b) => ({
      id: b.id,
      start: fmtTime(b.startsAt),
      end: fmtTime(b.endsAt),
      title: b.title,
      bookerName: b.bookerName,
    })),
    { headers: { "Cache-Control": "no-store" } },
  );
}
