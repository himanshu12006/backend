// controllers/cartController.js
// PURPOSE: Business logic to manage user carts (add to cart, update quantity, remove item, get cart)

const asyncHandler = require("express-async-handler");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const sendResponse = require("../utils/apiResponse");

// Helper function to find or create a cart for a user
const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
};

// @desc    Get user's cart items
// @route   GET /api/cart
// @access  Private
const getCart = asyncHandler(async (req, res) => {
  // Populate product details in the cart so frontend can render name, image, stock status etc.
  const cart = await getOrCreateCart(req.user._id);
  
  const populatedCart = await Cart.findById(cart._id).populate({
    path: "items.product",
    select: "name price stock images category sizes",
  });

  sendResponse(res, 200, "Cart items fetched successfully", populatedCart);
});

// @desc    Add an item to cart
// @route   POST /api/cart
// @access  Private
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity, size } = req.body;

  // 1. Validation
  if (!productId || !size) {
    res.status(400);
    throw new Error("Product ID and size are required");
  }

  const qty = Number(quantity) || 1;

  // 2. Check if product exists in database
  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  // 3. Verify stock
  if (product.stock < qty) {
    res.status(400);
    throw new Error(`Insufficient stock. Only ${product.stock} items left.`);
  }

  // 4. Retrieve or create cart
  const cart = await getOrCreateCart(req.user._id);

  // 5. Check if the exact product with the exact size is already in the cart
  const existingItemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId && item.size === size
  );

  if (existingItemIndex > -1) {
    // If it exists, update quantity
    const newQty = cart.items[existingItemIndex].quantity + qty;
    
    if (product.stock < newQty) {
      res.status(400);
      throw new Error(`Cannot add more. Total cart quantity exceeds available stock (${product.stock}).`);
    }

    cart.items[existingItemIndex].quantity = newQty;
    cart.items[existingItemIndex].price = product.price; // Update price snapshot
  } else {
    // If it doesn't exist, push a new item to items array
    cart.items.push({
      product: productId,
      quantity: qty,
      size,
      price: product.price,
    });
  }

  await cart.save();
  
  const updatedCart = await Cart.findById(cart._id).populate({
    path: "items.product",
    select: "name price stock images category sizes",
  });

  sendResponse(res, 200, "Item added to cart successfully", updatedCart);
});

// @desc    Update quantity of a cart item
// @route   PUT /api/cart
// @access  Private
const updateCartQuantity = asyncHandler(async (req, res) => {
  const { productId, size, quantity } = req.body;

  if (!productId || !size || quantity === undefined) {
    res.status(400);
    throw new Error("Product ID, size, and quantity are required");
  }

  const qty = Number(quantity);
  if (qty < 1) {
    res.status(400);
    throw new Error("Quantity must be at least 1");
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    res.status(404);
    throw new Error("Cart not found");
  }

  const itemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId && item.size === size
  );

  if (itemIndex === -1) {
    res.status(404);
    throw new Error("Item not found in cart");
  }

  // Verify stock limit
  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  if (product.stock < qty) {
    res.status(400);
    throw new Error(`Only ${product.stock} items are available in stock.`);
  }

  cart.items[itemIndex].quantity = qty;
  await cart.save();

  const updatedCart = await Cart.findById(cart._id).populate({
    path: "items.product",
    select: "name price stock images category sizes",
  });

  sendResponse(res, 200, "Cart quantity updated successfully", updatedCart);
});

// @desc    Remove an item from cart
// @route   DELETE /api/cart
// @access  Private
const removeFromCart = asyncHandler(async (req, res) => {
  const { productId, size } = req.body;

  if (!productId || !size) {
    res.status(400);
    throw new Error("Product ID and size are required");
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    res.status(404);
    throw new Error("Cart not found");
  }

  const initialItemsLength = cart.items.length;
  
  // Filter out the item to delete
  cart.items = cart.items.filter(
    (item) => !(item.product.toString() === productId && item.size === size)
  );

  if (cart.items.length === initialItemsLength) {
    res.status(404);
    throw new Error("Item not found in cart");
  }

  await cart.save();

  const updatedCart = await Cart.findById(cart._id).populate({
    path: "items.product",
    select: "name price stock images category sizes",
  });

  sendResponse(res, 200, "Item removed from cart successfully", updatedCart);
});

module.exports = {
  getCart,
  addToCart,
  updateCartQuantity,
  removeFromCart,
};
