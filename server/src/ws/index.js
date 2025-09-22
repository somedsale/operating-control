const WebSocketServer = require("ws").Server;
const wss = new WebSocketServer({ port: 8181 });

module.exports = { wss };
