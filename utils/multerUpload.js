// utils/multerUpload.js
// PURPOSE: Handle file uploads before sending to Cloudinary
//
// Multer is a middleware that processes multipart/form-data
// (the format browsers use when uploading files).
//
// FLOW: User sends image → Multer saves to /uploads folder temporarily
//       → Our controller uploads from /uploads to Cloudinary
//       → We get a Cloudinary URL → Save URL in MongoDB
//       → Delete the temp file from /uploads

const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Use an ABSOLUTE path so the uploads folder is always found
// regardless of which directory Node.js is started from.
const UPLOADS_DIR = path.join(__dirname, "../uploads");

// Auto-create the uploads folder if it doesn't exist
// (prevents ENOENT errors after a fresh clone or system wipe)
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// diskStorage = saves files to disk (our uploads/ folder)
const storage = multer.diskStorage({
  // destination: where to save the file temporarily
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR); // absolute path — always works
  },

  // filename: what to name the saved file
  // We use Date.now() to make filenames unique and avoid overwrites
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    // Example: images-1699123456789-123456789.jpg
  },
});

// fileFilter: only allow image files
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;

  // Check the file extension
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  // Check the MIME type (the actual file type, not just the extension)
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true); // Accept the file
  } else {
    cb(new Error("Only image files (jpg, jpeg, png, webp) are allowed!"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
});

module.exports = upload;
