const app = require("./app");
const dotenv = require("dotenv");
const { port } = require("../config/env");
const { connect } = require("../config/database");
const ModbusService = require("./models/modbusClient");
const {startDiPlcSync} = require("./services/diPlcSync");
const { startPlcSensor } = require("./services/sensorService");
dotenv.config();
connect().then(() => {
  app.listen(port, async () => {
    console.log(`Server running on port ${port}`);
// --- bật simulator khi không tắt bằng env ---
await ModbusService.init();
startPlcSensor();
startDiPlcSync();
  });
});

