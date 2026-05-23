import { Router } from "express";

import {
  createProduct,
  createProductReview,
  getProducts,
  deleteProduct,
  getProductById,
  updateProduct,
} from "../controllers/productController";

import { protect, admin } from "../middlewares/authMiddleware";
import validate from "../middlewares/validateMiddleware";

import {
  createProductSchema,
  createReviewSchema,
} from "../validations/productValidation";

const router = Router();

// ===== Public Routes =====

// Get all products
router.get("/", getProducts);

// Get single product
router.get("/:id", getProductById);

// ===== Admin Routes =====

// Create product
router.post("/", protect, admin, validate(createProductSchema), createProduct);

// Update product
router.put(
  "/:id",
  protect,
  admin,

  // TODO: create updateProductSchema later
  validate(createProductSchema),

  updateProduct,
);

// Delete product
router.delete("/:id", protect, admin, deleteProduct);

// ===== Review Routes =====

// Add product review
router.post(
  "/:id/reviews",
  protect,
  validate(createReviewSchema),
  createProductReview,
);

export default router;
