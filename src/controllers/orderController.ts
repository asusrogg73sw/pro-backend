import mongoose from "mongoose";
import { Request, Response } from "express";
import Order from "../models/orderModel";
import Product from "../models/productModel";
import asyncHandler from "../middlewares/asyncHandler";

/* =========================================================
   @desc    Create new order (Race condition safe)
   @route   POST /api/orders
   @access  Private
========================================================= */
export const addOrderItems = asyncHandler(async (req: any, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderItems, shippingAddress, paymentMethod } = req.body;

    if (!orderItems || orderItems.length === 0) {
      res.status(400);
      throw new Error("No order items");
    }

    let itemsPrice = 0;

    // ✅ STOCK CHECK + ATOMIC STOCK UPDATE
    for (const item of orderItems) {
      const product = await Product.findOneAndUpdate(
        {
          _id: item.product,
          countInStock: { $gte: item.qty },
        },
        {
          $inc: { countInStock: -item.qty },
        },
        { new: true, session }
      );

      if (!product) {
        throw new Error("Not enough stock or product not found");
      }

      itemsPrice += product.price * item.qty;
    }

    // ✅ Server side price calculation
    const taxPrice = Number((0.15 * itemsPrice).toFixed(2));
    const shippingPrice = itemsPrice > 100 ? 0 : 10;
    const totalPrice = Number(
      (itemsPrice + taxPrice + shippingPrice).toFixed(2)
    );

    // ✅ Create order
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

    const createdOrder = await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json(createdOrder);
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    res.status(400);
    throw new Error(error.message || "Order creation failed");
  }
});

/* =========================================================
   @desc    Get order by ID
   @route   GET /api/orders/:id
   @access  Private
========================================================= */
export const getOrderById = asyncHandler(async (req: any, res: Response) => {
  const order = await Order.findById(req.params.id)
    .populate("user", "name email")
    .populate("orderItems.product", "name image price");

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // 🔒 User can only see own order (unless admin)
  if (
    order.user._id.toString() !== req.user._id.toString() &&
    !req.user.isAdmin
  ) {
    res.status(401);
    throw new Error("Not authorized");
  }

  res.json(order);
});

/* =========================================================
   @desc    Update order to paid
   @route   PUT /api/orders/:id/pay
   @access  Private
========================================================= */
export const updateOrderToPaid = asyncHandler(async (req: any, res: Response) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  order.isPaid = true;
  order.paidAt = new Date();

  order.paymentResult = {
    id: req.body.id,
    status: req.body.status,
    update_time: req.body.update_time,
    email_address: req.body.email_address,
  };

  const updatedOrder = await order.save();
  res.json(updatedOrder);
});

/* =========================================================
   @desc    Get logged in user orders
   @route   GET /api/orders/myorders
   @access  Private
========================================================= */
export const getMyOrders = asyncHandler(async (req: any, res: Response) => {
  const orders = await Order.find({ user: req.user._id })
    .sort({ createdAt: -1 });

  res.json(orders);
});

/* =========================================================
   @desc    Get all orders (Admin)
   @route   GET /api/orders
   @access  Private/Admin
========================================================= */
export const getOrders = asyncHandler(async (_req: any, res: Response) => {
  const orders = await Order.find({})
    .populate("user", "id name")
    .sort({ createdAt: -1 });

  res.json(orders);
});

/* =========================================================
   @desc    Update order to delivered (Admin)
   @route   PUT /api/orders/:id/deliver
   @access  Private/Admin
========================================================= */
export const updateOrderToDelivered = asyncHandler(
  async (req: any, res: Response) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }

    order.isDelivered = true;
    order.deliveredAt = new Date();

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  }
);