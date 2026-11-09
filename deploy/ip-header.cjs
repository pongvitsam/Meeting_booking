// โหลดก่อน server.js (node -r ./ip-header.cjs server.js)
// ตั้ง header x-client-ip จาก socket จริงของทุก request และเขียนทับค่าที่ client ส่งมาเอง
// เพื่อให้ log การแก้ไข/ยกเลิกบันทึก IP ที่ปลอมไม่ได้ (Next standalone ไม่ได้ส่ง IP ให้เอง)
const http = require("node:http");
const create = http.createServer;

http.createServer = function patched(...args) {
  const i = args.findIndex((a) => typeof a === "function");
  if (i >= 0) {
    const listener = args[i];
    args[i] = function (req, res) {
      req.headers["x-client-ip"] = req.socket.remoteAddress || "";
      return listener.call(this, req, res);
    };
  }
  return create.apply(this, args);
};
