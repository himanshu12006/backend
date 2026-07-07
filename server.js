// server.js
// PURPOSE: Main entry point for our Node.js & Express backend application
// It connects to MongoDB, sets up middleware, and mounts API routes.

const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

// 1. Load environment variables from .env file
dotenv.config();

// 2. Connect to MongoDB
connectDB();

// 2b. Initialize Firebase Admin SDK (eager load so credentials are validated on startup)
require("./config/firebaseAdmin");

// 3. Initialize Express App
const app = express();

// 4. Configure Middlewares
// CORS (Cross-Origin Resource Sharing): Allow requests from our React frontend
// We whitelist both localhost (dev) and the deployed frontend URL (prod)
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL,        // Render frontend URL set in env vars
].filter(Boolean);                  // Remove undefined if FRONTEND_URL is not set

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (Postman, mobile apps, curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked: ${origin} is not allowed`));
    },
    credentials: true, // Allow sending HTTP-only cookies back and forth
  })
);

// Body Parser: Parse JSON payloads sent in requests (available as req.body)
app.use(express.json());

// URL-encoded Parser: Parse URL-encoded payloads (e.g. from postman forms)
app.use(express.urlencoded({ extended: true }));

// Cookie Parser: Parse cookie headers (needed for JWT stored in cookie)
app.use(cookieParser());

// 5. Basic Welcome / Health check route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to OM CLOTH HOUSE Backend API! Status: Online & Active.",
  });
});

// 6. Mount API Route Handlers
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/cart", require("./routes/cartRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/payment", require("./routes/paymentRoutes"));

// 7. Global Error Handlers (MUST be mounted at the end after all routes)
// Route not found handler (falls through if request matches no route above)
app.use(notFound);

// Central error handler (processes errors thrown in controllers)
app.use(errorHandler);

// 8. Start listening for incoming network requests
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
