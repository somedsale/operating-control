const { clientMQTT } = require('../mqtt');
const controlService = require('../services/controlService');
const relayService = require('../services/relayService');
const { sendToAll } = require('../ws/sendToAll');

const getAllControls = async (req, res) => {
  try {
    const constrols = await controlService.getAllControls();
    res.status(200).json(constrols);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const getStatusControl = async (req, res) => {
  try {
    const control = await controlService.getControlById(req.params.id);
    if(!control){
      return res.status(404).json({ message: 'control not found' });
    }
    const relay = await relayService.findRelayById(control.relay._id)
    if(!relay){
      return res.status(404).json({ message: 'Relay not found' });
    }
    
    return res.status(200).json(relay);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const createControl = async (req, res) => {
  try {
    const control = await controlService.createControl(req.body);
    res.status(201).json(control);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const TurnOnControl = async (ws, wss, data) => {
  const response = {
    type: "control/turn_on",
    id: data.id,
    status: false,
    error: false,
    msg: "",
  };
  try {
    const control = await controlService.getControlById(data.id);
    if (!control) {
      response.error = true;
      response.msg = { message: "control not found" };
      sendToAll(wss, response);
      return;
    }
    const relay = await relayService.findRelayById(control.relay._id);
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
    const turnOncontrol = await relayService.TurnOn(relay);
    response.error = false;
    response.msg = { turnOncontrol, message: "control turn on" };
    response.status = true;
    sendToAll(wss, response);
  } catch (error) {
    response.error = true;
    response.msg = { message: error.message };
  }
};
const TurnOffControl = async (ws, wss, data) => {
  const response = {
    type: "control/turn_off",
    id: data.id,
    status: false,
    error: false,
    msg: "",
  };
  try {
    const control = await controlService.getControlById(data.id);
    if (!control) {
      response.error = true;
      response.msg = { message: "control not found" };
      sendToAll(wss, response);
      return;
    }
    const relay = await relayService.findRelayById(control.relay._id);
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
    const turnOffcontrol = await relayService.TurnOff(relay);
    response.error = false;
    response.status = true;
    response.msg = { turnOffcontrol, message: "control turn off" };
    sendToAll(wss, response);
  } catch (error) {
    response.error = true;
    response.msg = { message: error.message };
    sendToAll(wss, response);
  }
};
const changeRelay = async(req, res)=>{
  try {
    const {id,relayId} = req.body;
    const control= await controlService.getControlById(id);
    if(!control){
      return res.status(404).json({ message: 'control not found' });
    }
    const relay = await relayService.findRelayById(relayId);
    if(!relay){
      return res.status(404).json({ message: 'Relay not found' });
    }
    const newcontrol = await controlService.changeRelay(id,relay);
    res.status(201).json(newcontrol);

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { getAllControls, createControl,TurnOnControl, TurnOffControl ,changeRelay ,getStatusControl };