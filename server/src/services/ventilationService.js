const ventilationModel = require('../models/ventilationModel');
const getVentilation = async () => {
  return await ventilationModel.findOne();
};
const createVentilation = async (data) => {
  const ventilation = new ventilationModel(data);
  return await ventilation.save();
};
const turnOn = async () =>{
  const ventilation= await ventilationModel.findOne();
    return await ventilation.updateOne({status:true});
}
const turnOff = async () =>{
  const ventilation= await ventilationModel.findOne();
    return await ventilation.updateOne({status:false});
}
const ChangeLaminarFlowAlarm = async (isAlarm) => {
  const ventilation= await ventilationModel.findOne();
    return await ventilation.updateOne({alarmLaminar:isAlarm});
};
const getPressure = async ()=>{
  const ventilation= await ventilationModel.findOne();
    return ventilation.pressure;
}
const getStatus = async ()=>{
  const ventilation= await ventilationModel.findOne();
    return ventilation.status;
}
const increaseVentilation = async ()=>{
  const ventilation= await ventilationModel.findOne();
    const volume = ventilation.volume+1
        return await ventilation.updateOne({volume});
}
const decreaseVentilation = async ()=>{
  const ventilation= await ventilationModel.findOne();
    const volume = ventilation.volume-1
        return await ventilation.updateOne({volume});
}
module.exports = { getVentilation,ChangeLaminarFlowAlarm, getPressure,getStatus,turnOn,turnOff,
    createVentilation, increaseVentilation, decreaseVentilation};
