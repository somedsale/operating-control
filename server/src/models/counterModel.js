const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Tên collection, ví dụ: 'user'
  sequenceValue: { type: Number, default: 1 }, // Giá trị ID tiếp theo
});

module.exports = mongoose.model('Counter', counterSchema);