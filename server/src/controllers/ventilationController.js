const { clientMQTT } = require("../mqtt");
const ventilationService = require("../services/ventilationService");
const { sendToAll } = require("../ws/sendToAll");
const getVentilation = async (req, res) => {
  try {
    const ventilation = await ventilationService.getVentilation();
    res.status(200).json(ventilation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const createVentilation = async (req, res) => {
  try {
    const ventilation = await ventilationService.createVentilation(req.body);
    res.status(201).json(ventilation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
const TurnOnVentilation = async (ws, wss, data) => {
  const response = {
    type: "ventilation/turn_on",
    // id: data.id,
    status: false,
    error: false,
    msg: "",
  };
  try {
    const ventilation = await ventilationService.turnOn();
    clientMQTT.publish(
      "control",
      "ON-VEN",
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
    response.status = true;
    response.msg = { message: ventilation };
    sendToAll(wss, response);
  } catch (error) {
    response.error = true;
    response.msg = { message: error.message };
    sendToAll(wss, response);
  }
};
const TurnOffVentilation = async (ws, wss, data) => {
  const response = {
    type: "ventilation/turn_on",
    // id: data.id,
    status: false,
    error: false,
    msg: "",
  };
  try {
    const ventilation = await ventilationService.turnOff();
    response.status = false;
    response.msg = { message: ventilation };
    clientMQTT.publish(
      "control",
      "OFF-VEN",
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
    sendToAll(wss, response);
  } catch (error) {
    response.error = true;
    response.msg = { message: error.message };
    sendToAll(wss, response);
  }
};
const getStatus = async (req, res) => {
  try {
    const ventilation = await ventilationService.getStatus();
    res.status(200).json(ventilation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
const increaseVentilation = async (ws, wss, data) => {
  const response = {
    type: data.type,
    // id: data.id,
    volume: data.volume,
    error: false,
    msg: "",
  };
  try {
    const ventilation = await ventilationService.increaseVentilation();
    response.volume = response.volume + 1;
    response.msg = { message: ventilation };
    sendToAll(wss, response);
  } catch (error) {
    response.error = true;
    response.msg = { message: error.message };
    sendToAll(wss, response);
  }
};
const decreaseVentilation = async (ws, wss, data) => {
    const response = {
    type: data.type,
    // id: data.id,
    volume: data.volume,
    error: false,
    msg: "",
  };
  try {
    const ventilation = await ventilationService.decreaseVentilation();
    response.volume = response.volume - 1;
    response.msg = { message: ventilation };
    sendToAll(wss, response);
  } catch (error) {
    response.error = true;
    response.msg = { message: error.message };
    sendToAll(wss, response);
  }
};
module.exports = {
  getVentilation,
  createVentilation,
  TurnOnVentilation,
  TurnOffVentilation,
  getStatus,
  increaseVentilation,
  decreaseVentilation,
};
