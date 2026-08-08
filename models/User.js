// models/User.js
// PURPOSE: Define the shape of a User document in MongoDB
//
// Mongoose Schema = the blueprint/template for a document
// Mongoose Model  = the class we use to create/read/update/delete documents

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],    // [type, error message]
      trim: true,                               // removes extra whitespace
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,                             // no two users can have same email
      lowercase: true,                          // always store as lowercase
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please enter a valid email address",
      ],
    },

    password: {
      type: String,
      required: function() {
        return !this.authProvider || this.authProvider === "local";
      },
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // IMPORTANT: password is NEVER returned in queries by default
                     // You must explicitly do User.findOne().select('+password')
    },

    role: {
      type: String,
      enum: ["user", "admin"],    // only these two values are allowed
      default: "user",            // new users are regular users by default
    },

    avatar: {
      public_id: { type: String, default: "" },   // Cloudinary public ID (for deletion)
      url: { type: String, default: "" },          // Cloudinary image URL
    },

    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    firebaseUid: {
      type: String,
      default: "",
    },

    // For password reset functionality (optional but good to have)
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: true, // automatically adds createdAt and updatedAt fields
  }
);

// ============================================================
// PRE-SAVE MIDDLEWARE (Runs BEFORE saving to database)
// ============================================================
// Every time a user is saved, check if password was changed.
// If yes, hash the password before saving.
// This ensures the PLAIN TEXT password is NEVER stored in MongoDB.

userSchema.pre("save", async function () {
  // "this" refers to the current user document being saved

  // If password was NOT modified or is not set, skip hashing
  if (!this.isModified("password") || !this.password) {
    return;
  }

  // bcrypt.genSalt(10) generates a "salt" (random string added to password)
  const salt = await bcrypt.genSalt(10);

  // Hash the password using the salt
  this.password = await bcrypt.hash(this.password, salt);
});


// ============================================================
// INSTANCE METHOD: comparePassword
// ============================================================
// We add a custom method to every User document.
// Usage: const isMatch = await user.comparePassword("entered_password")

userSchema.methods.comparePassword = async function (enteredPassword) {
  // bcrypt.compare() hashes the entered password with the same salt
  // and compares it to the stored hash. Returns true or false.
  return await bcrypt.compare(enteredPassword, this.password);
};

// Create the model from the schema
// mongoose.model("User", schema) → creates a "users" collection in MongoDB
const User = mongoose.model("User", userSchema);

module.exports = User;
