require("dotenv").config();
const { connect } = require("../../config/database");
const Device = require("../models/Device");

const data = [
  { deviceId: "light_1", name: "Light 1", relay: 1 },
  { deviceId: "light_2", name: "Light 2", relay: 2 },
  { deviceId: "light_3", name: "Light 3", relay: 3 },
  { deviceId: "light_4", name: "Light 4", relay: 4 },
  { deviceId: "operating_lamp", name: "Operating Lamp", relay: 5 },
  { deviceId: "xray", name: "X-Ray", relay: 6},
  { deviceId: "in_use", name: "In Use", relay: 7 },
  { deviceId: "general_light", name: "General Light", relay: 8 },
  { deviceId: "uv", name: "UV", relay: 9 },
  { deviceId: "heat_lamp", name: "Heating Lamp", relay: 10 },
  { deviceId: "ips_relay", name: "IPS", relay: 11 },
];

(async () => {
  await connect(process.env.MONGO_URI);
  await Device.deleteMany({});
  await Device.insertMany(data);
  console.log("[seed] inserted", data.length, "devices");
  process.exit(0);
})();
