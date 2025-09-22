const gasModel = require('../models/gasModel');

const getAllGas = async () => {
  return await gasModel.find();
};

const createGas = async (data) => {
  // Tạo document Email trước
  const gas = new gasModel(data);
  return await gas.save();
};
const getGasById = async (id) =>{
  return await gasModel.findOne({id:Number(id)});
}

module.exports = { getAllGas, createGas ,getGasById };