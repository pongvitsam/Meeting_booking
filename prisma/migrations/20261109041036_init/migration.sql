-- CreateTable
CREATE TABLE "rooms" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "equipment" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "room_id" INTEGER NOT NULL,
    "booker_name" TEXT NOT NULL,
    "dept" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "starts_at" DATETIME NOT NULL,
    "ends_at" DATETIME NOT NULL,
    "cancelled_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bookings_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_name_key" ON "rooms"("name");

-- CreateIndex
CREATE INDEX "bookings_room_id_starts_at_idx" ON "bookings"("room_id", "starts_at");

-- เวลาสิ้นสุดต้องหลังเวลาเริ่ม
CREATE TRIGGER "bookings_time_order_ins" BEFORE INSERT ON "bookings"
WHEN NEW."ends_at" <= NEW."starts_at"
BEGIN
  SELECT RAISE(ABORT, 'bookings_time_order');
END;

CREATE TRIGGER "bookings_time_order_upd" BEFORE UPDATE ON "bookings"
WHEN NEW."ends_at" <= NEW."starts_at"
BEGIN
  SELECT RAISE(ABORT, 'bookings_time_order');
END;

-- กันจองซ้อนช่วงเวลาในห้องเดียวกัน (เฉพาะรายการที่ยังไม่ถูกยกเลิก)
-- SQLite เขียนได้ทีละคำสั่งและ trigger ทำงานภายในคำสั่งเขียนเดียวกัน จึงกันการจองพร้อมกันได้
CREATE TRIGGER "bookings_no_overlap_ins" BEFORE INSERT ON "bookings"
WHEN NEW."cancelled_at" IS NULL AND EXISTS (
  SELECT 1 FROM "bookings" b
  WHERE b."room_id" = NEW."room_id" AND b."cancelled_at" IS NULL
    AND b."starts_at" < NEW."ends_at" AND b."ends_at" > NEW."starts_at"
)
BEGIN
  SELECT RAISE(ABORT, 'bookings_no_overlap');
END;

CREATE TRIGGER "bookings_no_overlap_upd" BEFORE UPDATE ON "bookings"
WHEN NEW."cancelled_at" IS NULL AND EXISTS (
  SELECT 1 FROM "bookings" b
  WHERE b."id" <> NEW."id" AND b."room_id" = NEW."room_id" AND b."cancelled_at" IS NULL
    AND b."starts_at" < NEW."ends_at" AND b."ends_at" > NEW."starts_at"
)
BEGIN
  SELECT RAISE(ABORT, 'bookings_no_overlap');
END;
