/**
 * config/db.js
 * -----------------------------------------
 * MongoDB Atlas connection using Mongoose.
 * Exports a single connect() function that
 * is called once in server.js at startup.
 * -----------------------------------------
 */

const mongoose = require("mongoose");

/**
 * connectDB — Establishes connection to MongoDB Atlas.
 * Retries are handled by Mongoose's built-in reconnect logic.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // These options suppress deprecation warnings in Mongoose 6+
      // and are kept here for clarity / older versions
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // ---- Connection event listeners ----
    mongoose.connection.on("error", (err) => {
      console.error(`❌ MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️  MongoDB disconnected. Attempting to reconnect...");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected successfully.");
    });
  } catch (error) {
    console.error(`❌ Failed to connect to MongoDB: ${error.message}`);
    // Exit process with failure code so the container / PM2 can restart
    process.exit(1);
  }
};

module.exports = connectDB;
