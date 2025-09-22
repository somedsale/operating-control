const Lighting = require('../models/lightingModel');
const relayModel = require('../models/relayModel');

const getAllLightings = async () => {
  return await Lighting.find();
};

const createLighting = async (lightingData) => {
  const { name, relay } = lightingData;

  // Tạo document Email trước
  const relayItem = await relayModel.create({ relay });
  const lighting = new Lighting({ name, relay:relayItem });
  return await lighting.save();
};
const getLightingById = async (id) =>{
  return await Lighting.findOne({id:Number(id)});
}
const changeRelay = async (id, relay) =>{
  const lighting = await Lighting.findOne({id:Number(id)});
  return await lighting.updateOne({relay})
}
module.exports = { getAllLightings, createLighting,getLightingById,changeRelay};