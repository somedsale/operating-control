const mongoose = require("mongoose");

// Các loại khí
const GAS_CODES = ["O2", "N2O", "MA4", "MA7", "VA", "CO2"];

// Trạng thái: 0 = Normal, 1 = High (Fault High), 2 = Low (Fault Low)
const STATUS = { NORMAL: 0, HIGH: 1, LOW: 2 };
const STATUS_ENUM = Object.values(STATUS);

const GasSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      enum: GAS_CODES,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: { type: String, required: true, trim: true },
    // 0=Normal, 1=High, 2=Low
    status: { type: Number, enum: STATUS_ENUM, default: STATUS.NORMAL },
    // updatedAt sẽ được mongoose cập nhật tự động (timestamps)
    updatedAt: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
    collection: "medical_gases",
    // map timestamps để cập nhật 'updatedAt' tự động cho cả save() & update ops
    timestamps: { createdAt: false, updatedAt: "updatedAt" },
  }
);

// (Không cần pre('save') nữa vì đã dùng timestamps)
// GasSchema.pre("save", function (next) { this.updatedAt = new Date(); next(); });

const Gas = mongoose.model("Gas", GasSchema);

module.exports = { Gas, GAS_CODES, STATUS, STATUS_ENUM };
