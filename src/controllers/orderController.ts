// backend/controllers/orderController.ts
import mongoose from "mongoose";
import { Request, Response } from "express";

import Order from "../models/orderModel";
import Product from "../models/productModel";
import asyncHandler from "../middlewares/asyncHandler";

interface AuthRequest extends Request {
  user?: any; 
}

// 1. Create New Order Controller
export const addOrderItems = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    // console.log("VALIDATED REQ BODY:", req.body);
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { orderItems, shippingAddress, paymentMethod } = req.body;

      if (!orderItems || orderItems.length === 0) {
        res.status(400);
        throw new Error("No order items");
      }

      let itemsPrice = 0;

      for (const item of orderItems) {
        // ✅ DEPRECATION WARNING FIXED: 'new: true' replaced with "returnDocument: 'after'"
        const product = await Product.findOneAndUpdate(
          {
            _id: item.product,
            countInStock: { $gte: item.qty },
          },
          {
            $inc: { countInStock: -item.qty },
          },
          {
            returnDocument: 'after',
            session,
          }
        );

        if (!product) {
          throw new Error("Not enough stock or product not found");
        }

        itemsPrice += product.price * item.qty;
      }

      const taxPrice = Number((0.15 * itemsPrice).toFixed(2));
      const shippingPrice = itemsPrice > 100 ? 0 : 10;
      const totalPrice = Number((itemsPrice + taxPrice + shippingPrice).toFixed(2));

      const order = new Order({
        orderItems,
        user: req.user._id,
        shippingAddress,
        paymentMethod,
        itemsPrice,
        taxPrice,
        shippingPrice,
        totalPrice,
        isUserLocked: false
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
  }
);

// 2. Get Order By ID Controller
export const getOrderById = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email")
      .populate("orderItems.product", "name image price");

    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }

    if (order.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      res.status(401);
      throw new Error("Not authorized");
    }

    res.json(order);
  }
);

// 3. Update Order To Paid Controller
export const updateOrderToPaid = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }

    if (req.body.shippingAddress) {
      order.shippingAddress = req.body.shippingAddress;
    }

    order.isPaid = true;
    order.paidAt = new Date();

    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time || new Date().toISOString(),
      email_address: req.body.email_address || req.body.email,
    };

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  }
);

// 4. Get Logged In User Orders Controller
export const getMyOrders = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  }
);

// 5. Get All Orders (Admin Only)
export const getOrders = asyncHandler(
  async (_req: AuthRequest, res: Response) => {
    const orders = await Order.find({}).populate("user", "id name").sort({ createdAt: -1 });
    res.json(orders);
  }
);

// 6. Update Order To Delivered (Admin Only)
export const updateOrderToDelivered = asyncHandler(
  async (req: AuthRequest, res: Response) => {
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

// Toggle Lock State
export const toggleOrderLock = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }

    if (order.user.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error("Not authorized to manage this order lock configuration");
    }

    order.isUserLocked = !order.isUserLocked;
    const updatedOrder = await order.save();

    res.json(updatedOrder);
  }
);

// Delete / Cancel Any Order
export const deleteOrder = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }

    if (order.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      res.status(401);
      throw new Error("Not authorized to cancel this order");
    }

    if (order.isUserLocked) {
      res.status(400);
      throw new Error("Order is locked. Please unlock it before deleting.");
    }

    for (const item of order.orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { countInStock: item.qty },
      });
    }

    await order.deleteOne();
    res.json({ message: "Order successfully deleted and stock adjusted" });
  }
);