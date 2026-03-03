import { Router } from "express";
import { createProduct, createProductReview, getProducts } from "../controllers/productController";
import { protect, admin } from "../middlewares/authMiddleware";
import validate from "../middlewares/validateMiddleware";
import { createProductSchema } from "../validations/productValidation";

const router = Router();

// Sab products dekhna Public hai (Har koi dekh sakta hai)
// Lekin product create karna Private + Admin hai
router.get("/", getProducts);
router.post("/", protect, admin, validate(createProductSchema), createProduct);
router.post("/:id/reviews", protect, createProductReview)
export default router;
