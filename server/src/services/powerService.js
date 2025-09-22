const power = require('../models/powerModel');
const findAllPower = async () =>{
  return await power.find();
}

const getPowerById = async (id) =>{
    return await power.findOne({id:Number(id)})
}
const createPower = async (powerData) =>{
    const newPower =  new power(powerData);
    return await newPower.save();
}
module.exports = { findAllPower, getPowerById, createPower };