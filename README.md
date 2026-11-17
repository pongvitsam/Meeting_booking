# ระบบจองห้องประชุม

Next.js + SQLite ใช้ภายในวง LAN ไม่มี login ไม่ต้องอนุมัติ ห้องเดียว แสดงปฏิทินภาษาไทย (พ.ศ.)

- ทุกคนจอง แก้ไข และยกเลิกได้ ระบบบันทึกชื่อผู้ดำเนินการ เวลา IP และรายการที่เปลี่ยนไว้ ให้แอดมินดูที่ `/admin/logs`
- แอดมิน (รหัสผ่านเดียว) ดูการจองทั้งหมด ประวัติการแก้ไข/ยกเลิก และตั้งค่าห้อง
- ไม่ต้องติดตั้งฐานข้อมูลแยก ข้อมูลทั้งหมดอยู่ในไฟล์ SQLite ไฟล์เดียว

## ติดตั้งบน Windows Server ครั้งแรก

เครื่อง server ต้องมีแค่ **Node.js LTS** (v20.9 ขึ้นไป แนะนำ v22, ติ๊ก "Add to PATH") ไม่ต้องมี IIS

1. ไปที่หน้า **Releases** ของ repo แล้วดาวน์โหลด `release.zip` เวอร์ชันล่าสุด (หรือ build เองด้วย `.\deploy\build-release.ps1`)
2. แตกไฟล์ แล้วเปิด PowerShell แบบ **Run as administrator** ในโฟลเดอร์นั้น:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\install.ps1 -AutoUpdate
   ```
   สคริปต์จะถามรหัสผ่านแอดมิน (อย่างน้อย 8 ตัวอักษร) แล้วทำให้ครบ: ลงไฟล์ที่ `C:\MeetingBooking`, สร้าง `.env` (สุ่ม `SESSION_SECRET` ให้), สร้างฐานข้อมูลและห้องเริ่มต้น, ลงทะเบียนให้**เริ่มเองเมื่อเครื่องเปิด/รีสตาร์ท**, เปิด Firewall เฉพาะวง LAN, ตั้งสำรองรายคืน 02:00, (ถ้าใส่ `-AutoUpdate`) ตั้งเช็กเวอร์ชันใหม่ทุกคืน 03:00, และตรวจว่าเว็บตอบสนอง
3. เปิด `http://<IP หรือชื่อเครื่อง>/` จากเครื่องอื่นในวง LAN และแอดมินที่ `/admin/login`

ตัวเลือกของ `install.ps1`: `-Port 8080` (ค่าเริ่มต้น 80), `-RoomName "ห้องประชุมใหญ่" -RoomCapacity 30`, `-AdminPassword "..."` (ไม่ถาม), `-Root D:\MeetingBooking`, `-BackupCopyTo \\fileserver\backup\meeting` (ก๊อปไฟล์สำรองไป drive กลางด้วย), `-AutoUpdate` (เปิดอัปเดตอัตโนมัติ), `-UpdateHour 3`

> ครั้งแรกบน server จริง ควร **รีสตาร์ทเครื่อง 1 ครั้ง** แล้วเปิดเว็บจากเครื่องอื่นเพื่อยืนยันว่าเริ่มเอง

## การทำงานโดยไม่ต้องมีคนดูแล

| สิ่งที่เกิดขึ้นเอง | รายละเอียด |
|---|---|
| เริ่มตอนเปิดเครื่อง | Scheduled Task `MeetingBooking` (บัญชี SYSTEM ไม่ต้อง login) |
| กู้ตัวเองเมื่อล่ม/ค้าง | เช็ก `/api/health` ทุก 60 วินาที ล้มเหลว 3 ครั้งติดจะรีสตาร์ท; process ตายก็เริ่มใหม่ใน 5 วินาที |
| สำรองฐานข้อมูล | ทุกคืน 02:00 เก็บ 30 วัน ตรวจไฟล์สำรองด้วย integrity check (และก๊อปไป drive กลางถ้าตั้ง `-BackupCopyTo`) |
| อัปเกรด | ถ้าเปิด `-AutoUpdate` ทุกคืน 03:00 เช็ก GitHub Release และติดตั้งเวอร์ชันใหม่เอง (มี rollback) |
| บันทึกเหตุการณ์ | Event Viewer > Windows Logs > Application > source `MeetingBooking` (รีสตาร์ท, สำรองล้มเหลว, อัปเกรด/ย้อนกลับ) |

### ไฟล์และตำแหน่งบน server

| ที่ | คืออะไร |
|---|---|
| `C:\MeetingBooking\app` | โค้ดที่รันอยู่ (ถูกเขียนทับตอนอัปเกรด; ของเดิมเก็บเป็น `app.prev`) |
| `C:\MeetingBooking\.env` | รหัสผ่านแอดมิน, `SESSION_SECRET`, path ฐานข้อมูล, พอร์ต (แก้แล้วรีสตาร์ทเว็บ) |
| `C:\MeetingBooking\data\meeting_booking.db` | ฐานข้อมูล |
| `C:\MeetingBooking\backup` | ไฟล์สำรองรายคืน + `pre-upgrade-*` ที่สำรองก่อนอัปเกรดทุกครั้ง |
| `C:\MeetingBooking\logs` | `server.log` (ตัวคุมเว็บ), `node-out.log`/`node-error.log` (ตัวแอป), `update.log` |
| `C:\MeetingBooking\update.ps1`, `restore.ps1` | สคริปต์ดูแลระบบ (อยู่นอก `app` เพื่อไม่ถูกเขียนทับ) |

## อัปเกรดเวอร์ชัน

ขั้นตอนของผู้พัฒนา (เพิ่มฟังก์ชันใหม่):
1. แก้โค้ดบน branch → รันเทสต์ในเครื่อง (`npm run lint`, `npx tsc --noEmit`, `npm run test:migrations`, `npm run test:concurrency`)
2. เปิด PR เข้า `main` — **CI ต้องเขียว** ([.github/workflows/ci.yml](.github/workflows/ci.yml))
3. เพิ่มเลข `version` ใน `package.json` (เช่น `0.2.0`) แล้ว merge
4. ติด tag ให้ตรงเลขนั้น: `git tag v0.2.0 && git push origin v0.2.0` → GitHub Actions build `release.zip` + `release.zip.sha256` แล้วสร้าง Release ให้เอง ([release.yml](.github/workflows/release.yml); ถ้า tag ไม่ตรงกับ `version` จะ build ไม่ผ่าน)

ฝั่ง server:
- **อัตโนมัติ:** ถ้าติดตั้งด้วย `-AutoUpdate` คืนถัดไปเวลา 03:00 server จะดึงเวอร์ชันใหม่ไปติดตั้งเอง
- **สั่งเอง:** PowerShell แบบ administrator → `C:\MeetingBooking\update.ps1` (หรือ `-Version v0.2.0` เพื่อเลือกเวอร์ชัน)

`update.ps1` ทำตามลำดับ: ดาวน์โหลด → ตรวจ SHA-256 → **สำรอง DB (`pre-upgrade-*`)** → เก็บ `app` เดิมเป็น `app.prev` → ติดตั้ง + migrate ฐานข้อมูล → ตรวจ `/api/health`
ถ้าตรวจไม่ผ่าน จะ **ย้อนกลับเป็นเวอร์ชันเดิมและคืนข้อมูลก่อนอัปเกรดให้เอง** แล้วบันทึกลง Event Log และ `logs\update.log`

ปิดอัปเดตอัตโนมัติ: `Unregister-ScheduledTask MeetingBooking-Update -Confirm:$false`

### กติกาเวลาเพิ่มฟังก์ชัน (สำคัญ)
- **เปลี่ยนฐานข้อมูลแบบเพิ่มเท่านั้น** เขียน migration SQL เอง เช่น `ALTER TABLE ... ADD COLUMN` (ใส่ค่าเริ่มต้นเสมอ) ห้ามลบ/เปลี่ยนชนิดคอลัมน์เดิม เพราะเวอร์ชันเก่าต้องย้อนกลับมาใช้ได้
- **ห้ามปล่อยให้ Prisma สร้าง migration แบบ RedefineTables** (ตอนแก้ตารางที่ SQLite เปลี่ยนตรง ๆ ไม่ได้) เพราะจะลบ trigger กันจองซ้อนทิ้ง `npm run test:migrations` จะจับกรณีนี้ใน CI
- ทุกการเปลี่ยนต้องผ่าน CI ก่อนติด tag

## กู้คืนข้อมูล

เลือกไฟล์สำรองใน `C:\MeetingBooking\backup` แล้วรัน (PowerShell แบบ administrator):
```powershell
C:\MeetingBooking\restore.ps1 -From C:\MeetingBooking\backup\meeting_booking_20261117_020000.db
```
สคริปต์หยุดเว็บ เก็บฐานข้อมูลปัจจุบันไว้เป็น `before-restore_*.db` แล้วทับด้วยไฟล์สำรองและเริ่มเว็บใหม่

## คำสั่งที่ใช้บ่อย (PowerShell แบบ administrator)

```powershell
Get-ScheduledTask MeetingBooking | Get-ScheduledTaskInfo        # ดูสถานะ
Stop-ScheduledTask MeetingBooking; Start-ScheduledTask MeetingBooking   # รีสตาร์ทเว็บ
Get-Content C:\MeetingBooking\logs\server.log -Tail 50           # ดู log ตัวคุมเว็บ
Get-Content C:\MeetingBooking\logs\update.log -Tail 50           # ดู log การอัปเกรด
Start-ScheduledTask MeetingBooking-Backup                        # สำรองทันที
C:\MeetingBooking\app\uninstall.ps1                              # ถอนการติดตั้ง (ไม่ลบข้อมูล; ใส่ -RemoveData เพื่อลบหมด)
```

## หมายเหตุด้านความปลอดภัย

- Firewall อนุญาตเฉพาะ LocalSubnet และช่วง IP ส่วนตัว (10.x, 172.16–31.x, 192.168.x) ไม่เปิดออกอินเทอร์เน็ต ถ้า server ต่อเน็ตตรง ๆ ให้ตรวจ Firewall ขององค์กรด้วย
- ไม่มี HTTPS (ใช้ภายใน LAN) ถ้าต้องการ ให้วาง IIS/nginx เป็น reverse proxy ด้านหน้า (มีตัวอย่าง [deploy/web.config](deploy/web.config)) แล้วตั้ง `-Port` ให้ Next ฟังพอร์ตอื่น
- ชื่อผู้ดำเนินการใน log เป็นชื่อที่ผู้ใช้กรอกเอง (ไม่มี login) แต่ IP มาจากการเชื่อมต่อจริงและปลอมไม่ได้
- อัปเดตอัตโนมัติเชื่อถือสิ่งที่อยู่ใน GitHub Release ของ repo นี้ — ควรเปิด 2FA และจำกัดคนที่ push tag ได้ ถ้า repo เป็น private ให้ใส่ token แบบอ่านอย่างเดียว (Contents: read) ไว้ใน `C:\MeetingBooking\update.token`
- ใช้เว็บแอปเพียง **หนึ่ง process** ต่อไฟล์ฐานข้อมูล (สคริปต์ตั้งไว้ให้แล้ว)

## รันบนเครื่อง dev

1. คัดลอก `.env.example` เป็น `.env` แล้วตั้ง `ADMIN_PASSWORD` และ `SESSION_SECRET` (ยาว 32+ ตัวอักษร)
2. ```bash
   npm install
   npm run db:migrate
   npm run db:seed
   npm run dev
   ```
3. เปิด http://localhost:3000 และแอดมินที่ `/admin/login`

ข้อมูลตัวอย่าง: `npm run mock:seed` (สร้างทั้งเดือน) / `npm run mock:clear` (ลบเฉพาะข้อมูลตัวอย่าง)
เทสต์: `npm run test:concurrency` (ต้องได้ `ok: 1`), `npm run test:migrations`

## กันจองซ้อนทำงานอย่างไร

trigger ใน SQLite ([migration](prisma/migrations/20261109041036_init/migration.sql)) ปฏิเสธการเขียนที่ช่วงเวลาซ้อนทับกับการจองเดิมในห้องเดียวกัน
SQLite เขียนได้ทีละคำสั่ง จึงกันการกดจองพร้อมกันได้ ฟอร์มจองยังตรวจและเตือนทันทีเมื่อเลือกเวลาที่ชนกัน
