// models/Cart.js
// PURPOSE: Store each user's shopping cart in the database
//
// Each user has ONE cart document.
// The cart contains an array of items (product + quantity + size).
// When user adds to cart → we find their cart and push the item.
// When user checks out → we create an Order and clear the cart.

const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId, // Reference to a Product document
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, "Quantity must be at least 1"],
    default: 1,
  },
  size: {
    type: String,
    required: [true, "Please select a size"],
  },
  // Store price at the time of adding to cart
  // (in case product price changes later)
  price: {
    type: Number,
    required: true,
  },
});

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // each user has only ONE cart
    },

    items: [cartItemSchema], // array of cart items

    // Total price is calculated dynamically (not stored, computed)
  },
  {
    timestamps: true,
    // Add a virtual field "totalPrice" that computes on the fly
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual field: computed property that is NOT stored in MongoDB
// It calculates the total price whenever the cart is fetched
cartSchema.virtual("totalPrice").get(function () {
  return this.items.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);
});

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;
