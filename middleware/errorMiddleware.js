// middleware/errorMiddleware.js
// PURPOSE: Catch ALL errors from any route and send a clean JSON response
//
// Without this, if an error occurs, Express sends an ugly HTML error page.
// With this, every error returns a consistent JSON:
//   { success: false, message: "Something went wrong", stack: "..." }
//
// HOW TO USE: Mount this at the VERY END of server.js (after all routes)
// Express identifies error middleware by its 4 parameters: (err, req, res, next)

const errorHandler = (err, req, res, next) => {
  // Log the error to the console for debugging
  console.error("API Error:", err);

  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // -----------------------------------------------
  // Handle specific Mongoose errors with better messages
  // -----------------------------------------------

  // Mongoose bad ObjectId (e.g., "Product not found" when ID format is wrong)
  if (err.name === "CastError" && err.kind === "ObjectId") {
    statusCode = 404;
    message = "Resource not found. Invalid ID format.";
  }

  // Mongoose duplicate key error (e.g., email already exists)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists. Please use a different ${field}.`;
  }

  // Mongoose validation error (e.g., required field missing)
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token. Please log in again.";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired. Please log in again.";
  }

  // Send the error response
  res.status(statusCode).json({
    success: false,
    message,
    // Only show stack trace in development mode (not in production)
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};

// 404 handler: when no route matches the request
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  res.status(404);
  next(error); // pass to errorHandler
};

module.exports = { errorHandler, notFound };
