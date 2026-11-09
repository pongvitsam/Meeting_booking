# ระบบจองห้องประชุม

Next.js + SQLite ใช้ภายใน LAN ไม่มี login และไม่มี PIN (เบราว์เซอร์ที่จองได้ cookie สำหรับแก้ไข/ยกเลิก) และมีแอดมินด้วยรหัสผ่านเดียว
ไม่ต้องติดตั้งฐานข้อมูลแยก ข้อมูลทั้งหมดอยู่ในไฟล์เดียว

## รันบนเครื่อง dev

1. คัดลอก `.env.example` เป็น `.env` แล้วตั้ง `ADMIN_PASSWORD` และ `SESSION_SECRET` (ยาว 32+ ตัวอักษร)
2. ```bash
   npm install
   npm run db:migrate
   npm run db:seed
   npm run dev
   ```
3. เปิด http://localhost:3000 และแอดมินที่ `/admin/login`

ทดสอบการกันจองซ้อน: `npm run test:concurrency` (ต้องได้ `ok: 1`)

## กันจองซ้อนทำงานอย่างไร

trigger ใน SQLite ([migration](prisma/migrations/20261109041036_init/migration.sql)) ปฏิเสธการเขียนที่ช่วงเวลาซ้อนทับกับการจองเดิมในห้องเดียวกัน
SQLite เขียนได้ทีละคำสั่ง จึงกันการกดจองพร้อมกันได้ ให้ใช้เว็บแอปเพียง **หนึ่ง process** ต่อไฟล์ DB (ตามคู่มือ deploy ด้านล่าง)

## Deploy บน Windows Server

1. เครื่อง build: `.\deploy\build-release.ps1` ได้โฟลเดอร์ `release\`
2. คัดลอก `release\` ไป server และสร้าง `.env` ในนั้น โดยตั้ง `DATABASE_URL` เป็น path แบบ absolute เช่น
   `file:D:/data/meeting_booking.db?connection_limit=1` แล้วรัน `npx prisma migrate deploy` ครั้งแรก
   (ต้อง `npm install` ในโฟลเดอร์นั้นก่อน เพื่อให้มี Prisma CLI)
3. ติดตั้ง service: `.\deploy\install-service.ps1 -AppDir <path> -Nssm <path to nssm.exe>`
4. IIS: ติดตั้ง URL Rewrite + ARR, สร้าง site ผูก HTTPS ใบรับรองภายใน, ใช้ `deploy\web.config` (แก้วง IP ให้ตรง LAN)
5. Firewall: เปิดเฉพาะ 443 จากวง LAN; port 3000 ต้องไม่เปิดออกนอกเครื่อง
6. Backup: ตั้ง Task Scheduler ให้รัน `deploy\backup-db.ps1 -Db <ไฟล์ .db> -Dest <drive กลาง>` ทุกคืน
7. เปลี่ยน `ADMIN_PASSWORD` ให้เดาไม่ง่ายก่อนใช้งานจริง
