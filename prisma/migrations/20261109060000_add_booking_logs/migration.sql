-- CreateTable
CREATE TABLE "booking_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "booking_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "actor_name" TEXT NOT NULL,
    "actor_ip" TEXT NOT NULL DEFAULT '',
    "booking_title" TEXT NOT NULL,
    "changes" TEXT NOT NULL DEFAULT '[]',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "booking_logs_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "booking_logs_created_at_idx" ON "booking_logs"("created_at");
