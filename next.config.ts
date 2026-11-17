import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

// เลขเวอร์ชันจาก package.json ฝังตอน build (แสดงที่ footer และ /api/health)
const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8")) as { version: string };

const nextConfig: NextConfig = {
  output: "standalone",
  env: { APP_VERSION: version },
  turbopack: {
    // มี package-lock.json ค้างที่โฟลเดอร์ home จึงระบุ root ให้ชัดเจน
    root: import.meta.dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
