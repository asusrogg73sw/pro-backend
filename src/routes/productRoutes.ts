import { Router } from "express";
import { createProduct, createProductReview, getProducts } from "../controllers/productController";
import { protect, admin } from "../middlewares/authMiddleware";
import validate from "../middlewares/validateMiddleware";
import { createProductSchema, createReviewSchema } from "../validations/productValidation";
import { deleteProduct } from "../controllers/productController.js";

const router = Router();

// Sab products dekhna Public hai (Har koi dekh sakta hai)
// Lekin product create karna Private + Admin hai
router.get("/", getProducts);
router.post("/", protect, admin, validate(createProductSchema), createProduct);
router.post("/:id/reviews", protect, validate(createReviewSchema), createProductReview)
router.delete("/:id", protect, admin, deleteProduct);
export default router;
