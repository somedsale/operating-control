const app = require("./app");
const dotenv = require("dotenv");
const { wss } = require("./ws");
const { port } = require("../config/env");
const { connect } = require("../config/database");
const { clientMQTT } = require("./mqtt");
const { main } = require("./ws/main");
dotenv.config();
const topic = "control";
connect().then(() => {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    clientMQTT.on("connect", () => {
      console.log("Connected");
      clientMQTT.subscribe([topic], () => {
        console.log(`Subscribe to topic '${topic}'`);
      });
    });
  });
});

// Xử lý khi nhận được message
clientMQTT.on("message", (topic, message) => {
  console.log(`Received message on topic ${topic}`);

  // Chuyển mảng byte thành chuỗi (giả sử dữ liệu là ASCII)
  const byteArray = new Uint8Array(message); // Chuyển Buffer thành Uint8Array
  let str = "";

  // Chuyển từng byte thành ký tự ASCII
  for (let i = 0; i < byteArray.length; i++) {
    str += String.fromCharCode(byteArray[i]);
  }

  // Loại bỏ ký tự null hoặc ký tự không mong muốn (nếu cần)
  str = str.replace(/\0/g, "").trim();

  console.log("Byte array:", byteArray);
  console.log("Converted string:", str);
});

// Xử lý lỗi
clientMQTT.on("error", (err) => {
  console.error("MQTT error:", err);
});

main(wss)
