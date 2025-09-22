const gasService = require('../services/gasService');

const getAllGas = async (req, res) => {
  try {
    const gas = await gasService.getAllGas();
    res.status(200).json(gas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const getStatusGas = async (req, res) => {
  try {
    const gas = await gasService.getGasById(req.params.id);
    if(!gas){
      return res.status(404).json({ message: 'Gas not found' });
    }
    return res.status(200).json(gas.status);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const createGas = async (req, res) => {
  try {
    const gas = await gasService.createGas(req.body);
    res.status(201).json(gas);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


module.exports = { getAllGas, createGas,getStatusGas };