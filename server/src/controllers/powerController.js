const powerService = require("../services/powerService");

const getAllPower = async (req, res) => {
  try {
    const power = await powerService.findAllPower();
    res.status(200).json(power);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const getStatus = async (req, res) => {
  try {
    const power = await powerService.getPowerById(req.params.id);
    res.status(200).json(power.status);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const createPower = async (req, res) => {
  try {
    const power = await powerService.createPower(req.body);
    res.status(201).json(power);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
module.exports = { getAllPower, getStatus, createPower };
