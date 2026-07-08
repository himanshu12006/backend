const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const Product = require("../models/Product");

const checkDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB!");
    const count = await Product.countDocuments();
    console.log(`Total products in DB: ${count}`);
    const products = await Product.find({});
    console.log("All products categories and details:");
    products.forEach((p, index) => {
      console.log(`${index + 1}. Name: "${p.name}", Category: "${p.category}", Price: ${p.price}`);
    });
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
};

checkDB();
