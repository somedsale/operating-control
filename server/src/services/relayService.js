const relayModel = require('../models/relayModel');
const findRelayById = async (id) =>{
  return await relayModel.findById(id);
}
const TurnOn = async (relay) =>{
    return await relay.updateOne({status:true})
}
const TurnOff = async (relay) =>{
    return await relay.updateOne({status:false})
}
const getStatus = async (id) =>{
    return await relayModel.findOne({id:Number(id)})
}
module.exports = { findRelayById, TurnOn, TurnOff, getStatus };
