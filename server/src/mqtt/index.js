const mqtt = require('mqtt');
const { protocolMQTT, hostMQTT, portMQTT } = require('../../config/env');
const clientId = `mqtt_${Math.random().toString(16).slice(3)}`

const connectUrl = `${protocolMQTT}://${hostMQTT}:${portMQTT}`
const clientMQTT = mqtt.connect(connectUrl, {
  clientId,
  clean: true,
  connectTimeout: 4000,
  username: process.env.USERMQTT?process.env.USERMQTT:'',
  password: process.env.PASSMQTT?process.env.PASSMQTT:'',
  reconnectPeriod: 1000,
})

module.exports = {clientMQTT};