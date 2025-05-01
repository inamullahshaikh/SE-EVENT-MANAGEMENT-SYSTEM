// server.js
const mongoose = require('mongoose');
const app = require('./app');

mongoose.connect(process.env.DB_URI).then(() => {
  app.listen(3001, () => console.log('Server running'));
});
