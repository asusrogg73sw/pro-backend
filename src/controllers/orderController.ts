import mongoose from "mongoose";
import { Request, Response } from "express";
import Order from "../models/orderModel";
import Product from "../models/productModel";
import asyncHandler from "../middlewares/asyncHandler";

interface AuthRequest extends Request {
  user?: any;
}

// 1. Create or Update Existing Pending Order Controller
export const addOrderItems = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { orderId, orderItems, shippingAddress, paymentMethod } = req.body;

      if (!orderItems || orderItems.length === 0) {
        res.status(400);
        throw new Error("No order items");
      }

      // 🔐 SECURITY & VALIDATION FILTER FOR EXISTING ORDERS
      if (orderId) {
        const existingOrder = await Order.findById(orderId).session(session);
        
        if (existingOrder) {
          // Rule A: Aglay user ko kisi aur ka order modify karne se rokna (Cross-User Exploit Fix)
          if (existingOrder.user.toString() !== req.user._id.toString()) {
            res.status(403);
            throw new Error("Not authorized to modify this order context.");
          }

          // Rule B: Paid orders ko touch karne se rokna
          if (existingOrder.isPaid) {
            res.status(400);
            throw new Error("Cannot modify an order that has already been paid.");
          }

          // --- STOCK MANAGEMENT BLOCK (Revert old stock before calculating new) ---
          for (const item of existingOrder.orderItems) {
            await Product.findByIdAndUpdate(
              item.product,
              { $inc: { countInStock: item.qty } },
              { session }
            );
          }
        }
      }

      let itemsPrice = 0;
      for (const item of orderItems) {
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
          throw new Error(`Not enough stock for ${item.name} or product not found`);
        }

        itemsPrice += product.price * item.qty;
      }

      const taxPrice = Number((0.15 * itemsPrice).toFixed(2));
      const shippingPrice = itemsPrice > 100 ? 0 : 10;
      const totalPrice = Number((itemsPrice + taxPrice + shippingPrice).toFixed(2));

      // ⚡ GLOBAL STRIP MAPPING SANITIZATION
      const cleanAddress = {
        firstName: shippingAddress?.firstName?.trim() || "",
        lastName: shippingAddress?.lastName?.trim() || "",
        address: shippingAddress?.address?.trim() || "",
        city: shippingAddress?.city?.trim() || "",
        postalCode: shippingAddress?.postalCode?.trim() || "",
        country: shippingAddress?.country?.trim() || "Pakistan",
        phone: shippingAddress?.phone?.trim() || "",
      };

      let order;

      if (orderId) {
        // Find existing operational order (Humne upar verify kar liya ke user authorization valid hai)
        order = await Order.findById(orderId).session(session);
        if (!order) {
          throw new Error("Target order context not found");
        }
        
        order.orderItems = orderItems;
        order.shippingAddress = cleanAddress;
        order.paymentMethod = paymentMethod;
        order.itemsPrice = itemsPrice;
        order.taxPrice = taxPrice;
        order.shippingPrice = shippingPrice;
        order.totalPrice = totalPrice;
      } else {
        // Create clean fresh tracking document for logged-in user
        order = new Order({
          orderItems,
          user: req.user._id,
          shippingAddress: cleanAddress,
          paymentMethod,
          itemsPrice,
          taxPrice,
          shippingPrice,
          totalPrice,
          isUserLocked: false
        });
      }

      const savedOrder = await order.save({ session });

      await session.commitTransaction();
      session.endSession();

      res.status(orderId ? 200 : 201).json(savedOrder);
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      if (res.statusCode === 200) res.status(400); // Bad Request fallback if status wasn't custom set
      throw new Error(error.message || "Order processing failed");
    }
  }
);

// 2. Get Order By ID Controller
export const getOrderById = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email")
      .populate("orderItems.product", "name image price");

    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }

    const orderUserRefId = order.user?._id?.toString() || order.user?.toString();
    if (orderUserRefId !== req.user._id.toString() && !req.user.isAdmin) {
      res.status(401);
      throw new Error("Not authorized");
    }

    res.json(order);
  }
);

// 3. Update Order To Paid Controller
export const updateOrderToPaid = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }

    if (req.body.shippingAddress) {
      order.shippingAddress = {
        firstName: req.body.shippingAddress.firstName?.trim() || order.shippingAddress.firstName,
        lastName: req.body.shippingAddress.lastName?.trim() || order.shippingAddress.lastName,
        address: req.body.shippingAddress.address?.trim() || order.shippingAddress.address,
        city: req.body.shippingAddress.city?.trim() || order.shippingAddress.city,
        postalCode: req.body.shippingAddress.postalCode?.trim() || order.shippingAddress.postalCode,
        country: req.body.shippingAddress.country?.trim() || order.shippingAddress.country,
        phone: req.body.shippingAddress.phone?.trim() || order.shippingAddress.phone,
      };
    }

    order.isPaid = true;
    order.paidAt = new Date();

    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time || new Date().toISOString(),
      email_address: req.body.email_address || req.body.email || "",
    };

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  }
);

// 4. Get Logged In User Orders Controller
export const getMyOrders = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  }
);

// 5. Get All Orders (Admin Only)
export const getOrders = asyncHandler(
  async (_req: AuthRequest, res: Response): Promise<void> => {
    const orders = await Order.find({}).populate("user", "id name").sort({ createdAt: -1 });
    res.json(orders);
  }
);

// 6. Update Order To Delivered (Admin Only)
export const updateOrderToDelivered = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
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
  async (req: AuthRequest, res: Response): Promise<void> => {
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }

    const orderUserRefId = order.user?._id?.toString() || order.user?.toString();
    if (orderUserRefId !== req.user._id.toString()) {
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
  async (req: AuthRequest, res: Response): Promise<void> => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await Order.findById(req.params.id).session(session);

      if (!order) {
        res.status(404);
        throw new Error("Order not found");
      }

      const orderUserRefId = order.user?._id?.toString() || order.user?.toString();
      if (orderUserRefId !== req.user._id.toString() && !req.user.isAdmin) {
        res.status(401);
        throw new Error("Not authorized to cancel this order");
      }

      if (order.isUserLocked) {
        res.status(400);
        throw new Error("Order is locked. Please unlock it before deleting.");
      }

      for (const item of order.orderItems) {
        await Product.findByIdAndUpdate(
          item.product, 
          { $inc: { countInStock: item.qty } },
          { session }
        );
      }

      await order.deleteOne({ session });
      
      await session.commitTransaction();
      session.endSession();
      
      res.json({ message: "Order successfully deleted and stock adjusted" });
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      res.status(400);
      throw new Error(error.message || "Order deletion transaction failure.");
    }
  }
);