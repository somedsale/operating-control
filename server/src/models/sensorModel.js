const mongoose = require('mongoose');
const sensorSchema = new mongoose.Schema({
    id: { type: Number, unique: true }, // Trường id tự tăng
    status: {
        type: Boolean,
        required: true,
        default:false
    },
});