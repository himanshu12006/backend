// controllers/productController.js
// PURPOSE: Business logic for managing products (CRUD: Create, Read, Update, Delete)
// Includes Cloudinary image uploads during product creation and update.

const asyncHandler = require("express-async-handler");
const Product = require("../models/Product");
const cloudinary = require("../config/cloudinary");
const sendResponse = require("../utils/apiResponse");
const fs = require("fs");

// Helper function to delete local temp file
const deleteLocalFile = (filePath) => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

// @desc    Add a new product
// @route   POST /api/products
// @access  Private/Admin
const addProduct = asyncHandler(async (req, res) => {
  const { name, description, price, category, stock, sizes } = req.body;

  // 1. Basic validation
  if (!name || !description || !price || !category || stock === undefined) {
    // If files were uploaded, make sure to delete them from temp storage so disk doesn't clog
    if (req.files) {
      req.files.forEach((file) => deleteLocalFile(file.path));
    }
    res.status(400);
    throw new Error("Please fill in all required fields (name, description, price, category, stock)");
  }

  // Parse sizes if sent as a JSON string (since multipart/form-data sends everything as strings)
  let parsedSizes = [];
  if (sizes) {
    try {
      parsedSizes = typeof sizes === "string" ? JSON.parse(sizes) : sizes;
    } catch (error) {
      parsedSizes = [sizes]; // fallback in case of raw string
    }
  }

  // 2. Upload images to Cloudinary (if any files uploaded)
  const imageObjects = [];
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      try {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: "om_cloth_house/products",
        });
        
        imageObjects.push({
          public_id: result.public_id,
          url: result.secure_url,
        });

        // Delete temporary file from local 'uploads' directory
        deleteLocalFile(file.path);
      } catch (uploadError) {
        // Clean up remaining temp files
        req.files.forEach((f) => deleteLocalFile(f.path));
        res.status(500);
        throw new Error(`Failed to upload images to Cloudinary: ${uploadError.message}`);
      }
    }
  } else {
    res.status(400);
    throw new Error("At least one product image is required");
  }

  // 3. Create product document
  const product = await Product.create({
    name,
    description,
    price,
    category,
    stock,
    sizes: parsedSizes,
    images: imageObjects,
    createdBy: req.user._id, // Attached by protect middleware
  });

  sendResponse(res, 201, "Product created successfully", product);
});

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getAllProducts = asyncHandler(async (req, res) => {
  // Add simple filtering query options
  const { category, keyword } = req.query;
  const query = {};

  if (category) {
    query.category = category;
  }

  if (keyword) {
    query.name = { $regex: keyword, $options: "i" }; // case-insensitive search
  }

  const products = await Product.find(query).populate("createdBy", "name email");
  sendResponse(res, 200, "Products fetched successfully", products);
});

// @desc    Get a single product by ID
// @route   GET /api/products/:id
// @access  Public
const getSingleProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate("createdBy", "name email");

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  sendResponse(res, 200, "Product details fetched successfully", product);
});

// @desc    Update an existing product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = asyncHandler(async (req, res) => {
  const { name, description, price, category, stock, sizes } = req.body;
  
  let product = await Product.findById(req.params.id);
  if (!product) {
    if (req.files) {
      req.files.forEach((file) => deleteLocalFile(file.path));
    }
    res.status(404);
    throw new Error("Product not found");
  }

  // Parse sizes if provided
  let parsedSizes = product.sizes;
  if (sizes) {
    try {
      parsedSizes = typeof sizes === "string" ? JSON.parse(sizes) : sizes;
    } catch (error) {
      parsedSizes = [sizes];
    }
  }

  // Handle image upload if new images are uploaded
  let imageObjects = product.images;
  if (req.files && req.files.length > 0) {
    // Optionally delete old images from Cloudinary to clean space
    for (const oldImg of product.images) {
      try {
        await cloudinary.uploader.destroy(oldImg.public_id);
      } catch (err) {
        console.error("Failed to delete old image from Cloudinary:", err.message);
      }
    }

    imageObjects = [];
    for (const file of req.files) {
      try {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: "om_cloth_house/products",
        });
        
        imageObjects.push({
          public_id: result.public_id,
          url: result.secure_url,
        });

        deleteLocalFile(file.path);
      } catch (err) {
        req.files.forEach((f) => deleteLocalFile(f.path));
        res.status(500);
        throw new Error(`Cloudinary upload failed: ${err.message}`);
      }
    }
  }

  // Update fields
  product.name = name || product.name;
  product.description = description || product.description;
  product.price = price !== undefined ? price : product.price;
  product.category = category || product.category;
  product.stock = stock !== undefined ? stock : product.stock;
  product.sizes = parsedSizes;
  product.images = imageObjects;

  const updatedProduct = await product.save();
  sendResponse(res, 200, "Product updated successfully", updatedProduct);
});

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  // 1. Delete images associated with product from Cloudinary
  for (const img of product.images) {
    try {
      await cloudinary.uploader.destroy(img.public_id);
    } catch (err) {
      console.error(`Failed to delete Cloudinary asset ${img.public_id}:`, err.message);
    }
  }

  // 2. Delete product from database
  await Product.findByIdAndDelete(req.params.id);

  sendResponse(res, 200, "Product deleted successfully");
});

module.exports = {
  addProduct,
  getAllProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
};
