import { Router } from "express";
import {
  addOrderItems,
  getMyOrders,
  getOrderById,
  updateOrderToPaid,
  getOrders,
  updateOrderToDelivered,
  deleteOrder,
  toggleOrderLock,
  // ⚡ Yeh naye stats controllers import karein:
  getDashboardStats,
  getTopSellingProducts,
  getMonthlySales,
} from "../controllers/orderController";
import { protect, admin } from "../middlewares/authMiddleware";
import validate from "../middlewares/validateMiddleware";
import { createOrderSchema } from "../validations/orderValidation";

const router = Router();

// ==========================================
// ADMIN DASHBOARD STATS ROUTES
// ==========================================
router.route("/admin/stats").get(protect, admin, getDashboardStats);
router.route("/admin/top-products").get(protect, admin, getTopSellingProducts);
router.route("/admin/monthly-sales").get(protect, admin, getMonthlySales);

// ==========================================
// CORE ORDER ROUTES
// ==========================================
router.route("/").post(protect, validate(createOrderSchema), addOrderItems);
router.route("/").get(protect, admin, getOrders);
router.route("/myorders").get(protect, getMyOrders);

router
  .route("/:id")
  .get(protect, getOrderById)
  .delete(protect, deleteOrder);

router.route("/:id/toggle-lock").put(protect, toggleOrderLock);
router.route("/:id/pay").put(protect, updateOrderToPaid);
router.route("/:id/deliver").put(protect, admin, updateOrderToDelivered);

export default router;