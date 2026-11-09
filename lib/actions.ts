"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { OverlapError, cancelBooking, createBooking, updateBooking } from "./booking-service";
import { bookingSchema, isInPast, roomSchema } from "./validators";
import { toBangkokParts } from "./time";
import {
  checkAdminPassword,
  createAdminSession,
  destroyAdminSession,
  isAdmin,
} from "./admin-auth";
import { addOwned } from "./ownership";
import { buildLog, diffBooking } from "./booking-log";

export type FormState =
  | { error?: string; fieldErrors?: Record<string, string>; values?: Record<string, string> }
  | undefined;

function str(fd: FormData, k: string) {
  return String(fd.get(k) ?? "");
}

function bookingFromForm(fd: FormData) {
  return bookingSchema.safeParse({
    roomId: str(fd, "roomId"),
    date: str(fd, "date"),
    start: str(fd, "start"),
    end: str(fd, "end"),
    bookerName: str(fd, "bookerName"),
    dept: str(fd, "dept"),
    phone: str(fd, "phone"),
    title: str(fd, "title"),
  });
}

// คืนค่าที่ผู้ใช้กรอกไว้ เพื่อไม่ให้ฟอร์มถูกรีเซ็ตเมื่อบันทึกไม่สำเร็จ
function keep(fd: FormData, s: FormState): FormState {
  const values: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string" && !k.startsWith("$")) values[k] = v;
  return { ...s, values };
}

function zodState(error: { issues: { path: PropertyKey[]; message: string }[] }): FormState {
  const fieldErrors: Record<string, string> = {};
  for (const i of error.issues) fieldErrors[String(i.path[0])] ??= i.message;
  return { error: Object.values(fieldErrors)[0], fieldErrors };
}

export async function createBookingAction(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = bookingFromForm(fd);
  if (!parsed.success) return keep(fd, zodState(parsed.error));
  if (isInPast(parsed.data.date, parsed.data.start)) {
    return keep(fd, { error: "ห้ามจองย้อนหลัง", fieldErrors: { start: "ห้ามจองย้อนหลัง" } });
  }
  let id: number;
  try {
    id = (await createBooking(parsed.data)).id;
  } catch (e) {
    if (e instanceof OverlapError) return keep(fd, { error: e.message });
    return keep(fd, { error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" });
  }
  await addOwned(id);
  revalidatePath("/", "layout");
  redirect(`/?m=${parsed.data.date.slice(0, 7)}&b=${id}&created=1`);
}

export async function updateBookingAction(_: FormState, fd: FormData): Promise<FormState> {
  const id = Number(str(fd, "id"));
  const actor = str(fd, "actorName").trim();
  if (!actor) return keep(fd, { error: "กรุณาระบุชื่อผู้แก้ไข", fieldErrors: { actorName: "กรุณาระบุชื่อผู้แก้ไข" } });
  const parsed = bookingFromForm(fd);
  if (!parsed.success) return keep(fd, zodState(parsed.error));
  const old = await prisma.booking.findUnique({ where: { id } });
  if (!old || old.cancelledAt) return keep(fd, { error: "ไม่พบการจองนี้ (อาจถูกยกเลิกไปแล้ว)" });
  // แก้รายละเอียดการจองที่เริ่มไปแล้วได้ ถ้าไม่ได้เปลี่ยนวัน/เวลาเริ่ม แต่จะย้ายไปเวลาที่ผ่านมาแล้วไม่ได้
  const was = toBangkokParts(old.startsAt);
  const moved = parsed.data.date !== was.date || parsed.data.start !== was.time;
  if (moved && isInPast(parsed.data.date, parsed.data.start)) {
    return keep(fd, { error: "ห้ามย้ายการจองไปเวลาย้อนหลัง", fieldErrors: { start: "ห้ามย้ายการจองไปเวลาย้อนหลัง" } });
  }
  try {
    const changes = diffBooking(old, parsed.data);
    await updateBooking(id, parsed.data, changes.length ? await buildLog("EDIT", old, actor, changes) : undefined);
  } catch (e) {
    if (e instanceof OverlapError) return keep(fd, { error: e.message });
    return keep(fd, { error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" });
  }
  revalidatePath("/", "layout");
  redirect(`/?m=${parsed.data.date.slice(0, 7)}&b=${id}&updated=1`);
}

// ยกเลิกพร้อมบันทึก log (ถ้าถูกยกเลิกไปแล้วถือว่าสำเร็จ เพื่อไม่ให้หน้าจอค้าง)
async function cancelWithLog(fd: FormData, actorLabel: (name: string) => string) {
  const id = Number(str(fd, "id"));
  const actor = str(fd, "actorName").trim();
  const old = await prisma.booking.findUnique({ where: { id } });
  if (old && !old.cancelledAt) await cancelBooking(id, await buildLog("CANCEL", old, actorLabel(actor)));
  revalidatePath("/", "layout");
}

export async function cancelBookingAction(fd: FormData) {
  if (!str(fd, "actorName").trim()) return;
  await cancelWithLog(fd, (n) => n);
  redirect("/?cancelled=1");
}

// ---------- แอดมิน ----------

export async function adminLoginAction(_: FormState, fd: FormData): Promise<FormState> {
  if (!checkAdminPassword(str(fd, "password"))) return { error: "รหัสผ่านไม่ถูกต้อง" };
  await createAdminSession();
  redirect("/admin/bookings");
}

export async function adminLogoutAction() {
  await destroyAdminSession();
  redirect("/");
}

export async function saveRoomAction(_: FormState, fd: FormData): Promise<FormState> {
  if (!(await isAdmin())) return { error: "ไม่มีสิทธิ์" };
  const parsed = roomSchema.safeParse({
    name: str(fd, "name"),
    capacity: str(fd, "capacity"),
    equipment: str(fd, "equipment"),
  });
  if (!parsed.success) return zodState(parsed.error);
  const id = Number(str(fd, "id")) || 0;
  try {
    if (id) await prisma.room.update({ where: { id }, data: parsed.data });
    else await prisma.room.create({ data: parsed.data });
  } catch {
    return { error: "บันทึกไม่สำเร็จ (ชื่อห้องอาจซ้ำ)" };
  }
  revalidatePath("/", "layout");
  redirect("/admin/rooms?saved=1");
}

export async function toggleRoomAction(fd: FormData) {
  if (!(await isAdmin())) return;
  const id = Number(str(fd, "id"));
  const room = await prisma.room.findUnique({ where: { id } });
  if (room) await prisma.room.update({ where: { id }, data: { active: !room.active } });
  revalidatePath("/", "layout");
}

export async function adminCancelAction(fd: FormData) {
  if (!(await isAdmin())) return;
  await cancelWithLog(fd, (n) => (n ? `แอดมิน (${n})` : "แอดมิน"));
}
