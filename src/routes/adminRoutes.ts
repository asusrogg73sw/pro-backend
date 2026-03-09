import { Router } from "express";
import { getDashboardStats, getMonthlySales, getTopSellingProducts } from "../controllers/adminController"; // 👈 Ye import karein
import { protect, admin } from "../middlewares/authMiddleware";

const router = Router();

router.use(protect);
router.use(admin);

router.route("/stats").get(getDashboardStats);
router.route("/top-products").get(getTopSellingProducts); // 👈 Ye line add karein
router.route("/monthly-sales").get(getMonthlySales);

export default router;