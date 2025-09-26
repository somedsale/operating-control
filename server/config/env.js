const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  origin: process.env.ORIGIN || "development",
  protocolMQTT: process.env.PROTOCOL_MQTT || "mqtt",
  hostMQTT: process.env.HOST_MQTT || "localhost",
  portMQTT: process.env.PORT_MQTT || "1883",
  PLC_IP:   process.env.PLC_IP   || '192.168.1.50',
  PLC_PORT: Number(process.env.PLC_PORT || 502),
  UNIT_ID:  Number(process.env.UNIT_ID  || 1),
  HTTP_PORT:Number(process.env.HTTP_PORT|| 3000),
};
