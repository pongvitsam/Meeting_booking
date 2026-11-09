import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { sessionKey } from "./session-key";

// จำว่าเบราว์เซอร์นี้เคยจองรายการไหน ใช้แสดงหน้า "การจองของฉัน" เท่านั้น (ใครก็แก้ไข/ยกเลิกได้ แต่ถูกบันทึก log)
const COOKIE = "mb_own";
const MAX_AGE = 60 * 60 * 24 * 90; // 90 วัน
const MAX_IDS = 100;

export async function getOwnedIds(): Promise<number[]> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return [];
  try {
    const { payload } = await jwtVerify(token, sessionKey());
    return Array.isArray(payload.ids) ? (payload.ids as number[]) : [];
  } catch {
    return [];
  }
}

export async function addOwned(id: number) {
  const ids = [...(await getOwnedIds()).filter((x) => x !== id), id].slice(-MAX_IDS);
  const token = await new SignJWT({ ids })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(sessionKey());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}
