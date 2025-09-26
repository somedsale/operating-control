const mongoose = require("mongoose");

// Các loại khí
const GAS_CODES = ["O2", "N2O", "MA4", "MA7", "VA", "CO2"];

// Trạng thái: 0 = Normal, 1 = Fault
const STATUS_ENUM = [0, 1];

const GasSchema = new mongoose.Schema(
  {
    code: { type: String, enum: GAS_CODES, required: true, unique: true, uppercase: true },
    name: { type: String, required: true },
    status: { type: Number, enum: STATUS_ENUM, default: 0 }, // 0=Normal, 1=Fault
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false, collection: "medical_gases" }
);

GasSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

const Gas = mongoose.model("Gas", GasSchema);

module.exports = { Gas, GAS_CODES, STATUS_ENUM };
