const express = require('express');
const userRoutes = require('./routes/userRoutes');
const lightingRoutes = require('./routes/lightingRoutes');
const sensorRoutes = require('./routes/sensorRoutes');
const controlRoutes = require('./routes/controlRoutes');
const powerRoutes = require('./routes/powerRoutes')
const gasRoutes = require('./routes/gasRoutes')
const ventilationRoutes = require('./routes/ventilationRoutes')

const app = express();
const cors = require('cors');
const { origin } = require('../config/env');
app.use(express.static('public'));
// Middleware
app.use(express.json()); // Parse JSON body
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded body
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // Cho phép tất cả origin
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'); // Các phương thức được phép
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Các header được phép
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200); // Xử lý preflight request
  }
  next();
});
// Routes
app.use('/api/users', userRoutes);
app.use('/api/lightings', lightingRoutes);
app.use('/api/sensor',sensorRoutes)
app.use('/api/control',controlRoutes)
app.use('/api/power',powerRoutes)
app.use('/api/gas',gasRoutes)
app.use('/api/ventilation',ventilationRoutes)


// Basic route
app.get('/', (req, res) => {
  res.send('Welcome to the Express API!');
});

module.exports = app;