// config/db.js
// PURPOSE: Connect our Express app to MongoDB using Mongoose
// Mongoose is an ODM (Object Document Mapper) — it lets us work
// with MongoDB using JavaScript objects and schemas instead of raw queries.

const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // mongoose.connect() returns a promise, so we await it
    // process.env.MONGO_URI reads the value from our .env file
    const conn = await mongoose.connect(process.env.MONGO_URI);

    // If connection is successful, log the host
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    // If connection fails, log the error and exit the process
    // process.exit(1) means "exit with error" (1 = failure, 0 = success)
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// Export this function so server.js can call it
module.exports = connectDB;
