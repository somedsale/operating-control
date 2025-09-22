const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  origin: process.env.ORIGIN || "development",
  protocolMQTT: process.env.PROTOCOL_MQTT || "mqtt",
  hostMQTT: process.env.HOST_MQTT || "localhost",
  portMQTT: process.env.PORT_MQTT || "1883",
};
