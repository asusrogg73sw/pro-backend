// backend/routes/orderRoutes.ts
import { Router } from "express";

/* =========================================================
   CONTROLLERS
   Ye saare functions orderController se aa rahe hain
========================================================= */
import {
  addOrderItems,
  getMyOrders,
  getOrderById,
  updateOrderToPaid,
  getOrders,
  updateOrderToDelivered,
  deleteOrder, // 🚀 NEW FIX: deleteOrder controller function ko import kiya
} from "../controllers/orderController";

/* =========================================================
   MIDDLEWARES
========================================================= */
// protect → Sirf logged-in users access kar sakte hain
// admin   → Sirf admin access kar sakta hai
import { protect, admin } from "../middlewares/authMiddleware";

// Request body validation middleware
import validate from "../middlewares/validateMiddleware";

// Joi/Zod/Yup schema for order validation
import { createOrderSchema } from "../validations/orderValidation";

const router = Router();

/* =========================================================
   @route   POST /api/orders
   @desc    Create New Order
   @access  Private

   Flow:
   User login hona chahiye
   Request body validate hogi
   Phir order create hoga
========================================================= */
router
  .route("/")
  .post(
    protect,
    validate(createOrderSchema),
    addOrderItems
  );

/* =========================================================
   @route   GET /api/orders
   @desc    Get All Orders
   @access  Private/Admin

   Sirf admin saare orders dekh sakta hai
========================================================= */
router
  .route("/")
  .get(
    protect,
    admin,
    getOrders
  );

/* =========================================================
   @route   GET /api/orders/myorders
   @desc    Get Logged In User Orders
   @access  Private

   Current user ke orders fetch karega
========================================================= */
router
  .route("/myorders")
  .get(
    protect,
    getMyOrders
  );

/* =========================================================
   @route   GET & DELETE /api/orders/:id
   @desc    Get Order By ID / Cancel Unpaid Order
   @access  Private

   User apna order dekh sakta hai aur delete/cancel kar sakta hai
   Admin kisi bhi user ka order dekh sakta hai
========================================================= */
router
  .route("/:id")
  .get(
    protect,
    getOrderById
  )
  .delete(
    protect, 
    deleteOrder
  ); // 🚀 NEW FIX: DELETE method ko standard private protect gateway ke sath bind kiya

/* =========================================================
   @route   PUT /api/orders/:id/pay
   @desc    Update Order To Paid
   @access  Private/Admin

   Payment successful hone ke baad
   order paid mark hoga
========================================================= */
router
  .route("/:id/pay")
  .put(
    protect,
    admin,
    updateOrderToPaid
  );

/* =========================================================
   @route   PUT /api/orders/:id/deliver
   @desc    Update Order To Delivered
   @access  Private/Admin

   Admin order ko delivered mark karega
========================================================= */
router
  .route("/:id/deliver")
  .put(
    protect,
    admin,
    updateOrderToDelivered
  );

export default router;