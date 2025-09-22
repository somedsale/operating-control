const {
  TurnOnControl,
  TurnOffControl,
} = require("../controllers/controlController");
const {
  TurnOnLight,
  TurnOffLight,
} = require("../controllers/lightingController");
const { updateTempAndHumtidy } = require("../controllers/tempController");
const {
  TurnOnVentilation,
  TurnOffVentilation,
  increaseVentilation,
  decreaseVentilation,
} = require("../controllers/ventilationController");

const main = (wss) => {
  // WebSocket connection
  wss.on("connection", (ws) => {
    console.log("Client connected");

    // setInterval(() => {
    //   updateTempAndHumtidy(wss);
    // }, 5000);
    // Handle incoming messages
    ws.on("message", async (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log("Received:", data);

        // Route messages to appropriate controller based on type
        switch (data.type) {
          case "lighting/turn_on":
            await TurnOnLight(ws, wss, data);
            break;
          case "lighting/turn_off":
            await TurnOffLight(ws, wss, data);
            break;
          case "control/turn_on":
            await TurnOnControl(ws, wss, data);
            break;
          case "control/turn_off":
            await TurnOffControl(ws, wss, data);
            break;
          case "ventilation/turn_on":
            await TurnOnVentilation(ws, wss, data);
            break;
          case "ventilation/turn_off":
            await TurnOffVentilation(ws, wss, data);
            break;
          case "ventilation/increase":
            await increaseVentilation(ws, wss, data);
            break;
          case "ventilation/decrease":
            await decreaseVentilation(ws, wss, data);
            break;
          default:
            ws.send(
              JSON.stringify({
                type: "error",
                content: "Unknown message type",
              })
            );
        }
      } catch (error) {
        console.error("Error processing message:", error);
        ws.send(
          JSON.stringify({
            type: "error",
            content: "Invalid message format",
          })
        );
      }
    });

    // Handle client disconnection
    ws.on("close", () => {
      console.log("Client disconnected");
    });
  });
};
module.exports = { main };
