const minTemp =30;
const maxTemp = 40;
const minHumd =30;
const maxHumd = 40;
const generateRandomNumber = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
const getTemperature = () => {
    return generateRandomNumber(minTemp ,maxTemp);
};
const getHumidity = () => {
    return generateRandomNumber(minHumd,maxHumd);
};

module.exports = { getTemperature, getHumidity };
