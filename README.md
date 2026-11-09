# ระบบจองห้องประชุม

Next.js + SQLite ใช้ภายในวง LAN ไม่มี login ไม่ต้องอนุมัติ ห้องเดียว แสดงปฏิทินภาษาไทย (พ.ศ.)

- ทุกคนจอง แก้ไข และยกเลิกได้ ระบบบันทึกชื่อผู้ดำเนินการ เวลา IP และรายการที่เปลี่ยนไว้ ให้แอดมินดูที่ `/admin/logs`
- แอดมิน (รหัสผ่านเดียว) ดูการจองทั้งหมด ประวัติการแก้ไข/ยกเลิก และตั้งค่าห้อง
- ไม่ต้องติดตั้งฐานข้อมูลแยก ข้อมูลทั้งหมดอยู่ในไฟล์ SQLite ไฟล์เดียว

## ติดตั้งบน Windows Server (แนะนำ)

เครื่อง server ต้องมีแค่ **Node.js LTS** (เวอร์ชันหลักเดียวกับเครื่อง build, ติ๊ก "Add to PATH") ไม่ต้องมีอินเทอร์เน็ต ไม่ต้องมี IIS

1. **เครื่อง build** (เครื่องที่มีอินเทอร์เน็ต): `.\deploy\build-release.ps1` ได้ `release.zip`
2. คัดลอก `release.zip` ไป server แล้วแตกไฟล์
3. เปิด PowerShell แบบ **Run as administrator** ในโฟลเดอร์ที่แตกไฟล์:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\install.ps1
   ```
   สคริปต์จะถามรหัสผ่านแอดมิน (อย่างน้อย 8 ตัวอักษร) แล้วทำให้ครบ: คัดลอกไฟล์ไป `C:\MeetingBooking`, สร้าง `.env` (สุ่ม `SESSION_SECRET` ให้), สร้างฐานข้อมูลและห้องเริ่มต้น, ลงทะเบียนให้**เริ่มเองเมื่อเครื่องเปิด/รีสตาร์ท** และเริ่มใหม่เองถ้าโปรแกรมล่ม, เปิด Firewall เฉพาะวง LAN, ตั้งสำรองฐานข้อมูลทุกคืน 02:00 และตรวจว่าเว็บตอบสนอง

ตัวเลือก: `-Port 8080` (ค่าเริ่มต้น 80), `-RoomName "ห้องประชุมใหญ่" -RoomCapacity 30`, `-AdminPassword "..."` (ไม่ถาม), `-Root D:\MeetingBooking`

เสร็จแล้วเปิด `http://<IP หรือชื่อเครื่อง>/` จากเครื่องอื่นในวง LAN และแอดมินที่ `/admin/login`

### อัปเกรด

build `release.zip` ใหม่ แตกบน server แล้วรัน `install.ps1` ซ้ำ จะคงไฟล์ `.env` และฐานข้อมูลเดิมไว้ และอัปเดตโครงสร้างฐานข้อมูลให้เอง

### ไฟล์และตำแหน่งบน server

| ที่ | คืออะไร |
|---|---|
| `C:\MeetingBooking\app` | โค้ดที่รันอยู่ (ถูกเขียนทับตอนอัปเกรด) |
| `C:\MeetingBooking\.env` | รหัสผ่านแอดมิน, `SESSION_SECRET`, path ฐานข้อมูล, พอร์ต (แก้ได้ แล้วสั่ง `Restart-ScheduledTask`/รีสตาร์ท) |
| `C:\MeetingBooking\data\meeting_booking.db` | ฐานข้อมูล |
| `C:\MeetingBooking\backup` | สำรองรายคืน เก็บ 30 วัน (เปลี่ยนที่เก็บได้โดยแก้ Scheduled Task `MeetingBooking-Backup`) |
| `C:\MeetingBooking\logs\server.log` | log ของเว็บ |

### คำสั่งที่ใช้บ่อย (PowerShell แบบ administrator)

```powershell
Get-ScheduledTask MeetingBooking | Get-ScheduledTaskInfo        # ดูสถานะ
Stop-ScheduledTask MeetingBooking; Start-ScheduledTask MeetingBooking   # รีสตาร์ทเว็บ
Get-Content C:\MeetingBooking\logs\server.log -Tail 50           # ดู log
Start-ScheduledTask MeetingBooking-Backup                        # สำรองทันที
.\uninstall.ps1                                                  # ถอนการติดตั้ง (ไม่ลบข้อมูล; ใส่ -RemoveData เพื่อลบหมด)
```

กู้คืนข้อมูล: หยุดเว็บ แล้วคัดลอกไฟล์ใน `backup` ทับ `data\meeting_booking.db` แล้วเริ่มเว็บ

### หมายเหตุด้านความปลอดภัย

- Firewall อนุญาตเฉพาะ LocalSubnet และช่วง IP ส่วนตัว (10.x, 172.16–31.x, 192.168.x) ไม่เปิดออกอินเทอร์เน็ต ถ้า server ต่อเน็ตตรง ๆ ให้ตรวจ Firewall ขององค์กรด้วย
- ไม่มี HTTPS (ใช้ภายใน LAN) ถ้าต้องการ ให้วาง IIS/nginx เป็น reverse proxy ด้านหน้า (มีตัวอย่าง [deploy/web.config](deploy/web.config)) แล้วตั้ง `-Port` ให้ Next ฟังพอร์ตอื่น
- ชื่อผู้ดำเนินการใน log เป็นชื่อที่ผู้ใช้กรอกเอง (ไม่มี login) แต่ IP มาจากการเชื่อมต่อจริงและปลอมไม่ได้
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
ทดสอบการกันจองซ้อน: `npm run test:concurrency` (ต้องได้ `ok: 1`)

## กันจองซ้อนทำงานอย่างไร

trigger ใน SQLite ([migration](prisma/migrations/20261109041036_init/migration.sql)) ปฏิเสธการเขียนที่ช่วงเวลาซ้อนทับกับการจองเดิมในห้องเดียวกัน
SQLite เขียนได้ทีละคำสั่ง จึงกันการกดจองพร้อมกันได้ ฟอร์มจองยังตรวจและเตือนทันทีเมื่อเลือกเวลาที่ชนกัน
