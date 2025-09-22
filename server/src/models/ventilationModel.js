const mongoose = require("mongoose");
const counterModel = require("./counterModel");

const ventilationSchema = new mongoose.Schema({
  id: { type: Number, unique: true }, // Trường id tự tăng
  alarmLaminar: { type: Boolean, default: false },
  alarmPressure: { type: Boolean, default: false },
  pressure: { type: Number, default: 0 },
  volume:{type:Number,default:1},
  status:{ type: Boolean, default: false }
});
// Middleware để tự động tăng id trước khi lưu
ventilationSchema.pre("save", async function (next) {
  const doc = this;
  if (!doc.isNew) return next(); // Chỉ tăng id cho document mới

  try {
    const counter = await counterModel.findOneAndUpdate(
      { _id: "ventilation" },
      { $inc: { sequenceValue: 1 } },
      { new: true, upsert: true } // Tạo mới nếu chưa có
    );
    doc.id = counter.sequenceValue;
    next();
  } catch (error) {
    next(error);
  }
});
module.exports = mongoose.model("ventilation", ventilationSchema);
