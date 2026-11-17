import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import Link from "next/link";
import { isAdmin } from "@/lib/admin-auth";
import { adminLogoutAction } from "@/lib/actions";
import "./globals.css";

const font = Noto_Sans_Thai({ subsets: ["thai", "latin"], display: "swap" });

export const metadata: Metadata = {
  title: "จองห้องประชุม",
  description: "ระบบจองห้องประชุมภายในองค์กร",
};

const navLink =
  "rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-100 transition hover:bg-white/15 hover:text-white";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const admin = await isAdmin();
  return (
    <html lang="th">
      <body className={`${font.className} min-h-screen antialiased`}>
        <header className="sticky top-0 z-30 bg-gradient-to-r from-indigo-700 to-violet-700 shadow-md">
          <nav className="mx-auto flex max-w-7xl flex-wrap items-center gap-1 px-4 py-2.5">
            <Link href="/" className="mr-3 flex items-center gap-2 text-lg font-bold text-white">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/20 text-base">📅</span>
              จองห้องประชุม
            </Link>
            <Link href="/" className={navLink}>ปฏิทิน</Link>
            <Link href="/my" className={navLink}>การจองของฉัน</Link>
            <span className="flex-1" />
            {admin ? (
              <>
                <Link href="/admin/bookings" className={navLink}>การจองทั้งหมด</Link>
                <Link href="/admin/logs" className={navLink}>ประวัติการแก้ไข</Link>
                <Link href="/admin/rooms" className={navLink}>ตั้งค่าห้อง</Link>
                <form action={adminLogoutAction}>
                  <button className={navLink}>ออกจากระบบแอดมิน</button>
                </form>
              </>
            ) : (
              <Link href="/admin/login" className={navLink}>แอดมิน</Link>
            )}
            <Link
              href="/book"
              className="ml-1 rounded-lg bg-white px-3.5 py-1.5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
            >
              + จองห้อง
            </Link>
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-7xl px-4 pb-6 text-center text-xs text-slate-400">
          ระบบจองห้องประชุม v{process.env.APP_VERSION} Organized by Pongvitsam
        </footer>
      </body>
    </html>
  );
}
