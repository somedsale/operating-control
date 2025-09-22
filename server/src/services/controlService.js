const controlsModel = require('../models/controlsModel');
const relayModel = require('../models/relayModel');

const getAllControls = async () => {
  return await controlsModel.find();
};

const createControl = async (data) => {
  const { name, relay } = data;

  // Tạo document Email trước
  const relayItem = await relayModel.create({ relay });
  const control = new controlsModel({ name, relay:relayItem });
  return await control.save();
};
const getControlById = async (id) =>{
  return await controlsModel.findOne({id:Number(id)});
}
const changeRelay = async (id, relay) =>{
  const control = await control.findOne({id:Number(id)});
  return await control.updateOne({relay})
}
module.exports = { getAllControls, createControl,getControlById,changeRelay};