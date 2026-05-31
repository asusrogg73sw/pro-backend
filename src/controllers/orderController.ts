// backend/controllers/orderController.ts
import mongoose from "mongoose";
import { Request, Response } from "express";

import Order from "../models/orderModel";
import Product from "../models/productModel";
import asyncHandler from "../middlewares/asyncHandler";

/* =========================================================
   Custom Request Interface
   req.user ko TypeScript samjhane ke liye
========================================================= */
interface AuthRequest extends Request {
  user?: any; // Better: apna IUser interface use karo
}

/* =========================================================
   @desc    Create New Order
   @route   POST /api/orders
   @access  Private

   Features:
   ✅ Race condition safe
   ✅ Atomic stock update
   ✅ Server-side price calculation
========================================================= */
export const addOrderItems = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    // MongoDB session start
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { orderItems, shippingAddress, paymentMethod } = req.body;

      // Check agar items exist nahi karte
      if (!orderItems || orderItems.length === 0) {
        res.status(400);
        throw new Error("No order items");
      }

      let itemsPrice = 0;

      /* =====================================================
         STOCK CHECK + STOCK UPDATE
         Har product ka stock verify aur reduce hoga
      ===================================================== */
      for (const item of orderItems) {
        const product = await Product.findOneAndUpdate(
          {
            _id: item.product,
            countInStock: { $gte: item.qty }, // stock available hona chahiye
          },
          {
            $inc: { countInStock: -item.qty }, // stock reduce
          },
          {
            new: true,
            session,
          }
        );

        // Agar product nahi mila ya stock kam hai
        if (!product) {
          throw new Error("Not enough stock or product not found");
        }

        // Total item price calculate
        itemsPrice += product.price * item.qty;
      }

      /* =====================================================
         SERVER SIDE PRICE CALCULATION
      ===================================================== */
      // 15% tax
      const taxPrice = Number((0.15 * itemsPrice).toFixed(2));

      // Shipping free if items > 100
      const shippingPrice = itemsPrice > 100 ? 0 : 10;

      // Final total
      const totalPrice = Number(
        (itemsPrice + taxPrice + shippingPrice).toFixed(2)
      );

      /* =====================================================
         CREATE ORDER
      ===================================================== */
      const order = new Order({
        orderItems,
        user: req.user._id,
        shippingAddress,
        paymentMethod,

        itemsPrice,
        taxPrice,
        shippingPrice,
        totalPrice,
      });

      // Save order inside transaction
      const createdOrder = await order.save({ session });

      // Commit transaction
      await session.commitTransaction();
      session.endSession();

      res.status(201).json(createdOrder);
    } catch (error: any) {
      // Rollback if error occurs
      await session.abortTransaction();
      session.endSession();

      res.status(400);
      throw new Error(error.message || "Order creation failed");
    }
  }
);

/* =========================================================
   @desc    Get Order By ID
   @route   GET /api/orders/:id
   @access  Private

   User apna order dekh sakta hai
   Admin kisi ka bhi order dekh sakta hai
========================================================= */
export const getOrderById = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email")
      .populate("orderItems.product", "name image price");

    // Order not found
    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }

    /* =====================================================
       Authorization Check
    ===================================================== */
    if (
      order.user._id.toString() !== req.user._id.toString() &&
      !req.user.isAdmin
    ) {
      res.status(401);
      throw new Error("Not authorized");
    }

    res.json(order);
  }
);

/* =========================================================
   @desc    Update Order To Paid
   @route   PUT /api/orders/:id/pay
   @access  Private
========================================================= */
export const updateOrderToPaid = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const order = await Order.findById(req.params.id);

    // Order not found
    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }

    // Mark as paid
    order.isPaid = true;
    order.paidAt = new Date();

    // Save payment result info
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time,
      email_address: req.body.email_address,
    };

    const updatedOrder = await order.save();

    res.json(updatedOrder);
  }
);

/* =========================================================
   @desc    Get Logged In User Orders
   @route   GET /api/orders/myorders
   @access  Private

   Current user ke saare orders
========================================================= */
export const getMyOrders = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const orders = await Order.find({
      user: req.user._id,
    }).sort({ createdAt: -1 });

    res.json(orders);
  }
);

/* =========================================================
   @desc    Get All Orders
   @route   GET /api/orders
   @access  Private/Admin

   Admin saare orders dekh sakta hai
========================================================= */
export const getOrders = asyncHandler(
  async (_req: AuthRequest, res: Response) => {
    // Populate user id + name
    const orders = await Order.find({})
      .populate("user", "id name")
      .sort({ createdAt: -1 });

    res.json(orders);
  }
);

/* =========================================================
   @desc    Update Order To Delivered
   @route   PUT /api/orders/:id/deliver
   @access  Private/Admin

   Admin order ko delivered mark karega
========================================================= */
export const updateOrderToDelivered = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const order = await Order.findById(req.params.id);

    // Order not found
    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }

    // Mark delivered
    order.isDelivered = true;

    // Delivery time save
    order.deliveredAt = new Date();

    const updatedOrder = await order.save();

    res.json(updatedOrder);
  }
);

/* =========================================================
   🚀 NEW FIX: Cancel/Delete Unpaid Order Controller
   @desc    Delete/Cancel An Unpaid Order & Restore Inventory Stock
   @route   DELETE /api/orders/:id
   @access  Private
========================================================= */
export const deleteOrder = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const order = await Order.findById(req.params.id);

    // 1. Validation guard: Order exist karna chahiye
    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }

    // 2. Authorization check: Sirf wahi user cancel kar sake jis ka order hai (ya admin)
    if (order.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      res.status(401);
      throw new Error("Not authorized to cancel this order");
    }

    // 3. Security Check: Agar order already paid hai toh delete block kar do
    if (order.isPaid) {
      res.status(400);
      throw new Error("Paid orders cannot be deleted or canceled");
    }

    /* =====================================================
       STOCK RESTORATION LOGIC 🔄
       Order cancel hone par product stock wapis barhana hoga
    ===================================================== */
    for (const item of order.orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { countInStock: item.qty }, // Stock safely increased back to inventory
      });
    }

    // 4. Document deletion fire ki database se
    await order.deleteOne();

    res.json({ message: "Order successfully canceled and stock restored" });
  }
);