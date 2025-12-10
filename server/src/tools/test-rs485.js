const plc = require('../services/plc.service');

(async () => {
  try {
    console.log("Writing VB106 = 5 ...");
    await plc.setRs485Address(5);
    console.log("OK, now reading...");
    const conf = await plc.getRs485Config();
    console.log(conf);
  } catch (e) {
    console.error("Error:", e);
  }
})();
