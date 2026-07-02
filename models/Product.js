// models/Product.js
// PURPOSE: Define the shape of a Product document in MongoDB
// Every product in the clothing store will follow this blueprint.

const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [200, "Product name cannot exceed 200 characters"],
    },

    description: {
      type: String,
      required: [true, "Product description is required"],
    },

    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Price cannot be negative"],
    },

    category: {
      type: String,
      required: [true, "Product category is required"],
      // Example categories for a clothing store
      enum: [
        "Men",
        "Women",
        "Kids",
        "T-Shirts",
        "Shirts",
        "Jeans",
        "Dresses",
        "Kurta",
        "Saree",
        "Accessories",
        "Other",
      ],
    },

    stock: {
      type: Number,
      required: [true, "Stock quantity is required"],
      min: [0, "Stock cannot be negative"],
      default: 0,
    },

    // Array of available sizes e.g. ["S", "M", "L", "XL"]
    sizes: {
      type: [String],
      enum: ["XS", "S", "M", "L", "XL", "XXL", "Free Size"],
      default: [],
    },

    // Array of images — each image has a Cloudinary public_id and url
    images: [
      {
        public_id: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
      },
    ],

    // Rating fields (for future product reviews)
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    numReviews: {
      type: Number,
      default: 0,
    },

    // Who created this product (must be an admin)
    // ref: "User" creates a relationship between Product and User
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
