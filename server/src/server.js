const app = require("./app");
const dotenv = require("dotenv");
const { port } = require("../config/env");
const { connect } = require("../config/database");
const ModbusService = require("./models/modbusClient");
const {startDiPlcSync} = require("./services/diPlcSync");
const { startPlcSensor } = require("./services/sensorService");
const {startSensorSimulator} = require("./services/sensorSimulator");
const {startPressureSimulation} = require("./services/pressureSimulator");
dotenv.config();
connect().then(() => {
  app.listen(port, async () => {
    console.log(`Server running on port ${port}`);
// --- bật simulator khi không tắt bằng env ---
    if (!process.env.DISABLE_SIMULATOR) {
      // startSensorSimulator();
      startPressureSimulation();
    }
// startPlcSensor();
// startDiPlcSync();
  });
});

