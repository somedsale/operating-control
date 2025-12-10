// server/src/tools/s7_quick_test.js
const nodes7 = require('nodes7');

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

async function connectSmart200(host) {
  const tryOnce = (rack, slot) => new Promise((res, rej) => {
    const c = new nodes7();
    c.initiateConnection({ host, port: 102, rack, slot }, err => err ? rej(err) : res(c));
  });
  try { return await tryOnce(0,1); } catch { return await tryOnce(0,0); }
}

(async () => {
  const host = process.env.PLC_IP || '192.168.1.200';
  console.log('Connecting to', host);
  let c = await connectSmart200(host);
  console.log('Connected. Waiting 150ms...');
  await sleep(150);

  // Vì version của bạn không có readItems(), ta dùng addItems + readAllItems
  const read = (tags) => new Promise((res, rej) => {
    c.setTranslationCB(x => x);      // alias = địa chỉ
    c.clearItems?.();
    c.addItems(tags);
    c.readAllItems((err, values) => err ? rej(err) : res(values));
  });
  const write = (tags, vals) => new Promise((res, rej) => {
    c.setTranslationCB(x => x);
    c.clearItems?.();
    c.addItems(tags);
    c.writeItems(tags, vals, (err) => err ? rej(err) : res(true));
  });

  try {
    console.log('READ I/Q/M:', await read(['I0.0','Q0.0','M0.0']));
    console.log('WRITE Q0.0 = 1');
    await write(['Q0.0'], [true]);
    console.log('READ Q0.0:', await read(['Q0.0']));
    console.log('READ AIs:', await read(['IW64','IW66','IW68','IW70']));
    console.log('OK.');
  } catch (e) {
    console.error('Test error:', e);
  } finally {
    try { c.dropConnection(); } catch {}
  }
})();
