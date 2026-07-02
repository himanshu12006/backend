// utils/apiResponse.js
// PURPOSE: Standardize all API responses
//
// Without this, every controller might return different shapes:
//   { data: ... }  or  { result: ... }  or  { user: ... }
//
// With this utility, EVERY response looks the same:
//   { success: true, message: "...", data: {...} }
//
// This makes it easy for the frontend to handle responses consistently.

const sendResponse = (res, statusCode, message, data = null) => {
  const response = {
    success: statusCode < 400, // true if status is 2xx/3xx
    message,
  };

  // Only include data field if data was provided
  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

module.exports = sendResponse;
