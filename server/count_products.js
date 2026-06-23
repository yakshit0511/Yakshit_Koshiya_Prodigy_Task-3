require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("./models/Product");

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB.");
    const count = await Product.countDocuments();
    console.log("Product count in DB:", count);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

run();
