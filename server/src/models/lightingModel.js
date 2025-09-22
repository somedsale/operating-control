const mongoose = require("mongoose");
const counterModel = require("./counterModel");

const lightingSchema = new mongoose.Schema({
  id: { type: Number, unique: true }, // Trường id tự tăng
  name: {
    type: String,
    required: true,
  },
  relay: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Relay",
    require: true,
  },
});
// Middleware để tự động tăng id trước khi lưu
lightingSchema.pre("save", async function (next) {
  const doc = this;
  if (!doc.isNew) return next(); // Chỉ tăng id cho document mới

  try {
    const counter = await counterModel.findOneAndUpdate(
      { _id: "lighting" },
      { $inc: { sequenceValue: 1 } },
      { new: true, upsert: true } // Tạo mới nếu chưa có
    );
    doc.id = counter.sequenceValue;
    next();
  } catch (error) {
    next(error);
  }
});
module.exports = mongoose.model("Lighting", lightingSchema);
