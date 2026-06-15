
const mongoose = require('mongoose');

const connectDB = async function () {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/focus-os'
  await mongoose.connect(uri);
  console.log("MongoDB Connected")
}

module.exports = connectDB