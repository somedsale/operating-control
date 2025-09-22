const mongoose = require('mongoose');
const counterModel = require('./counterModel');

const powerSchema = new mongoose.Schema({
    id: { type: Number, unique: true }, // Trường id tự tăng
    name:{type:String},
    status: {
        type: Boolean,
        required: true,
        default:false
    },
});
powerSchema.pre('save', async function (next) {
  const doc = this;
  if (!doc.isNew) return next(); // Chỉ tăng id cho document mới

  try {
    const counter = await counterModel.findOneAndUpdate(
      { _id: 'power' },
      { $inc: { sequenceValue: 1 } },
      { new: true, upsert: true } // Tạo mới nếu chưa có
    );
    doc.id = counter.sequenceValue;
    next();
  } catch (error) {
    next(error);
  }
});
module.exports = mongoose.model('Power', powerSchema);