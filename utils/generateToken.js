// utils/generateToken.js
// PURPOSE: Generate a JWT (JSON Web Token) for a user
//
// HOW JWT WORKS:
// 1. User logs in → we verify their password
// 2. We create a JWT containing their user ID
// 3. We send this token to the user (stored in a cookie)
// 4. For every protected request, user sends this token
// 5. We verify the token → know who the user is
//
// JWT has 3 parts: Header.Payload.Signature
// Example: eyJhbGci....eyJ1c2VySWQi....SflKxwRJSMeKKF2

const jwt = require("jsonwebtoken");

// res      → Express response object (to set cookie)
// userId   → The MongoDB _id of the user
const generateToken = (res, userId) => {
  // jwt.sign(payload, secret, options)
  // payload  → data to store inside the token (we store userId)
  // secret   → a long random string to sign the token (from .env)
  // expiresIn → how long the token is valid (7 days)
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });

  // Store the token in an HTTP-only cookie
  // HTTP-only = JavaScript in the browser CANNOT read it (protects from XSS attacks)
  // secure = only sent over HTTPS in production
  // sameSite = protects against CSRF attacks
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  });

  return token;
};

module.exports = generateToken;
