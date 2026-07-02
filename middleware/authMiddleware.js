// middleware/authMiddleware.js
// PURPOSE: Protect routes that require a logged-in user
//
// HOW IT WORKS:
// 1. User makes a request to a protected route (e.g., GET /api/cart)
// 2. This middleware runs FIRST (before the controller)
// 3. It reads the JWT token from the cookie
// 4. It verifies the token using our JWT_SECRET
// 5. If valid → attaches user info to req.user → calls next()
// 6. If invalid/missing → returns 401 Unauthorized error

const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");

// ============================================================
// protect: Verify JWT and attach user to request
// ============================================================
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Try to get token from HTTP-only cookie (primary method)
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // Also support Bearer token in Authorization header (for Postman testing)
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
    // "Bearer eyJhbGci..." → split by space → take [1]
  }

  // If no token found at all
  if (!token) {
    res.status(401);
    throw new Error("Not authorized. Please log in first.");
  }

  // Verify the token using our secret
  // If token is invalid or expired, jwt.verify() throws an error
  // asyncHandler will catch that error and pass it to our error middleware
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  // decoded = { userId: "64abc...", iat: 1699..., exp: 1699... }

  // Find the user in database using the ID stored in token
  // .select("-password") means: get all fields EXCEPT password
  req.user = await User.findById(decoded.userId).select("-password");

  if (!req.user) {
    res.status(401);
    throw new Error("User not found. Token is invalid.");
  }

  next(); // User is authenticated → proceed to the controller
});

// ============================================================
// isAdmin: Check if logged-in user is an admin
// ============================================================
// IMPORTANT: isAdmin must ALWAYS be used AFTER protect
// Usage in routes: router.delete("/product/:id", protect, isAdmin, deleteProduct)

const isAdmin = (req, res, next) => {
  // protect middleware already set req.user
  if (req.user && req.user.role === "admin") {
    next(); // User is admin → allow
  } else {
    res.status(403); // 403 = Forbidden (you're logged in, but not allowed)
    throw new Error("Access denied. Admin only.");
  }
};

module.exports = { protect, isAdmin };
