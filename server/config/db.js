
const mongoose = require('mongoose');

const connectDB = async function () {

  await mongoose.connect('mongodb://127.0.0.1:27017/test');
  console.log("Mongodb Connected")
}

module.exports = connectDB