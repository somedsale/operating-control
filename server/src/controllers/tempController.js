const tempService = require("../services/tempService");
const { sendToAll } = require("../ws/sendToAll");
const getTemperature = async (req, res) => {
  try {
    const tempertature = await tempService.getTemperature();
    res.status(200).json(tempertature);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const getHumidity = async (req, res) => {
  try {
    const humidity = await tempService.getHumidity();
    res.status(200).json(humidity);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const updateTempAndHumtidy = async (wss) => {
  const response = {
    type: "temp&humd",
    error: false,
    msg: "",
    temp: "",
    humd: "",
  };
  try {
    const tempertature = await tempService.getTemperature();
    const humidity = await tempService.getHumidity();
    response.temp = tempertature;
    response.humd = humidity;
    sendToAll(wss, response);
  } catch (error) {
    response.error = true;
    response.msg = { message: error.message };
    sendToAll(wss, response);
  }
};

module.exports = { getTemperature, getHumidity, updateTempAndHumtidy };
