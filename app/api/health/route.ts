import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// ใช้ตรวจสุขภาพ: watchdog (run-server.ps1) และ update.ps1 เรียกเพื่อดูว่าเว็บและฐานข้อมูลตอบสนอง
export async function GET() {
  const version = process.env.APP_VERSION ?? "dev";
  try {
    await prisma.room.count();
    return NextResponse.json({ status: "ok", version }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "error", version }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
