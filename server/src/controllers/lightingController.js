const { clientMQTT } = require("../mqtt");
const lightingService = require("../services/lightingService");
const relayService = require("../services/relayService");
const { sendToAll } = require("../ws/sendToAll");

const getAllLightings = async (req, res) => {
  try {
    const lightings = await lightingService.getAllLightings();
    res.status(200).json(lightings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const getStatusLight = async (req, res) => {
  try {
    const lighting = await lightingService.getLightingById(req.params.id);
    if (!lighting) {
      return res.status(404).json({ message: "Lighting not found" });
    }
    const relay = await relayService.findRelayById(lighting.relay._id);
    if (!relay) {
      return res.status(404).json({ message: "Relay not found" });
    }

    return res.status(200).json(relay);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const createLighting = async (req, res) => {
  try {
    const lighting = await lightingService.createLighting(req.body);
    res.status(201).json(lighting);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
// const TurnOn = async (req, res) => {
//   try {
//     const lighting = await lightingService.getLightingById(req.params.id);
//     if(!lighting){
//       return res.status(404).json({ message: 'Lighting not found' });
//     }
//     const relay = await relayService.findRelayById(lighting.relay._id)
//     const tempID = `ON${relay.id-1}`
//         clientMQTT.publish('control',tempID, { qos: 0, retain: false }, (error) => {
//     if (error) {
//       console.log(error);
//     }
//   })
//     if(!relay){
//       return res.status(404).json({ message: 'Relay not found' });
//     }
//     const turnOnLighting = await relayService.TurnOn(relay);
//     res.status(200).json({turnOnLighting, message: 'Lighting turn on'});
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };
const TurnOnLight = async (ws, wss, data) => {
  const response = {
    type: "lighting/turn_on",
    id: data.id,
    status: false,
    error: false,
    msg: "",
  };
  try {
    const lighting = await lightingService.getLightingById(data.id);
    if (!lighting) {
      response.error = true;
      response.msg = { message: "Lighting not found" };
      sendToAll(wss, response);
      return;
    }
    const relay = await relayService.findRelayById(lighting.relay._id);
    const tempID = `ON${relay.id - 1}`;
    clientMQTT.publish(
      "control",
      tempID,
      { qos: 0, retain: false },
      (error) => {
        if (error) {
          console.log(error);
          response.error = true;
          response.msg = { message: error };
          sendToAll(wss, response);
        }
      }
    );
    if (!relay) {
      response.error = true;
      response.msg = { message: "Relay not found" };
      sendToAll(wss, response);
      return;
    }
    const turnOnLighting = await relayService.TurnOn(relay);
    response.error = false;
    response.msg = { turnOnLighting, message: "Lighting turn on" };
    response.status = true;
    sendToAll(wss, response);
  } catch (error) {
    response.error = true;
    response.msg = { message: message.error };
    sendToAll(wss, response);
  }
};
const TurnOffLight = async (ws, wss, data) => {
  const response = {
    type: "lighting/turn_off",
    id: data.id,
    status: false,
    error: false,
    msg: "",
  };
  try {
    const lighting = await lightingService.getLightingById(data.id);
    if (!lighting) {
      response.error = true;
      response.msg = { message: "Lighting not found" };
      sendToAll(wss, response);
      return;
    }
    const relay = await relayService.findRelayById(lighting.relay._id);
    const tempID = `OFF${relay.id - 1}`;

    clientMQTT.publish(
      "control",
      tempID,
      { qos: 0, retain: false },
      (error) => {
        if (error) {
          console.log(error);
          response.error = true;
          response.msg = error;
          sendToAll(wss, response);
          return;
        }
      }
    );
    if (!relay) {
      response.error = true;
      response.msg = { message: "Relay not found" };
      sendToAll(wss, response);
      return;
    }
    const turnOffLighting = await relayService.TurnOff(relay);
    response.error = false;
    response.status = true;
    response.msg = { turnOffLighting, message: "Lighting turn off" };
    sendToAll(wss, response);
  } catch (error) {
    response.error = true;
    response.msg = { message: message.error };
  }
};
const changeRelay = async (req, res) => {
  try {
    const { id, relayId } = req.body;
    const lighting = await lightingService.getLightingById(id);
    if (!lighting) {
      return res.status(404).json({ message: "Lighting not found" });
    }
    const relay = await relayService.findRelayById(relayId);
    if (!relay) {
      return res.status(404).json({ message: "Relay not found" });
    }
    const newLighting = await lightingService.changeRelay(id, relay);
    res.status(201).json(newLighting);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getAllLightings,
  createLighting,
  TurnOnLight,
  TurnOffLight,
  changeRelay,
  getStatusLight,
};
