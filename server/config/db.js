const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/portfolio';
  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000
  });
  console.log(`[DB] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
};

module.exports = connectDB;