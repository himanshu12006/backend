// config/cloudinary.js
// PURPOSE: Configure Cloudinary for image uploads
// Cloudinary is a cloud service that stores images/videos.
// We send images here and get back a URL to store in MongoDB.

const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;
