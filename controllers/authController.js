// controllers/authController.js
// PURPOSE: Business logic for User Authentication (Register, Login, Logout, Profile)
// Express-async-handler lets us write clean async/await code without try-catch blocks.

const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const sendResponse = require("../utils/apiResponse");

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // 1. Basic validation
  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please enter all fields (name, email, password)");
  }

  // 2. Check if user already exists in the database
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("A user with this email already exists");
  }

  // 3. Create user (password is automatically hashed by User model pre-save hook)
  const user = await User.create({
    name,
    email,
    password,
  });

  if (user) {
    // 4. Generate JWT token & set it inside the HTTP-only cookie
    const token = generateToken(res, user._id);

    // 5. Send success response back (excluding the password)
    sendResponse(res, 201, "User registered successfully", {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

// @desc    Authenticate user & get token (Login)
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // 1. Validation
  if (!email || !password) {
    res.status(400);
    throw new Error("Please enter email and password");
  }

  // 2. Find user by email and explicitly select the password field
  // (since we set select: false in User schema for security)
  const user = await User.findOne({ email }).select("+password");

  // 3. Check if user exists and password is correct using our model method
  if (user && (await user.comparePassword(password))) {
    // 4. Generate JWT token & set HTTP-only cookie
    const token = generateToken(res, user._id);

    sendResponse(res, 200, "Logged in successfully", {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    });
  } else {
    res.status(401);
    throw new Error("Invalid email or password");
  }
});

// @desc    Logout user & clear cookie
// @route   POST /api/auth/logout
// @access  Public
const logoutUser = asyncHandler(async (req, res) => {
  // Clear the cookie by setting it to empty string and setting expiry to past date
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
  });

  sendResponse(res, 200, "Logged out successfully");
});

// @desc    Get user profile (Protected route)
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  // req.user is populated by protect middleware
  const user = await User.findById(req.user._id);

  if (user) {
    sendResponse(res, 200, "User profile fetched successfully", {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Get all users (Admin only)
// @route   GET /api/auth/users
// @access  Private/Admin
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password').sort({ createdAt: -1 });
  sendResponse(res, 200, 'All users fetched successfully', users);
});

// @desc    Update user role (Admin only)
// @route   PUT /api/auth/users/:id/role
// @access  Private/Admin
const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) {
    res.status(400);
    throw new Error('Invalid role. Must be "user" or "admin"');
  }
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true, runValidators: true }
  ).select('-password');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  sendResponse(res, 200, `User role updated to ${role}`, user);
});

// @desc    Delete user (Admin only)
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  if (user._id.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error('You cannot delete your own account');
  }
  await User.findByIdAndDelete(req.params.id);
  sendResponse(res, 200, 'User deleted successfully');
});

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  getAllUsers,
  updateUserRole,
  deleteUser,
};
