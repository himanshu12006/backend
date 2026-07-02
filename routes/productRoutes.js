// routes/productRoutes.js
// PURPOSE: Routes for product operations (creating, fetching, updating, and deleting products)

const express = require("express");
const router = express.Router();
const {
  addProduct,
  getAllProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");
const { protect, isAdmin } = require("../middleware/authMiddleware");
const upload = require("../utils/multerUpload");

// PUBLIC ROUTES: Anyone can view products or a single product details
router.get("/", getAllProducts);
router.get("/:id", getSingleProduct);

// ADMIN PROTECTED ROUTES: Only logged-in admin users can create, update, or delete products
// We use upload.array("images", 5) to allow up to 5 images to be uploaded in the request
router.post("/", protect, isAdmin, upload.array("images", 5), addProduct);
router.put("/:id", protect, isAdmin, upload.array("images", 5), updateProduct);
router.delete("/:id", protect, isAdmin, deleteProduct);

module.exports = router;
