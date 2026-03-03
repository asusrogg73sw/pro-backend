import { Request, Response } from "express";
import Order from "../models/orderModel";
import asyncHandler from "../middlewares/asyncHandler";
import Product from "../models/productModel";

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
// @desc    Create new order & Update Stock

export const addOrderItems = asyncHandler(async (req: any, res: Response) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
  } = req.body;

  if (!orderItems || orderItems.length === 0) {
    res.status(400);
    throw new Error("No order items");
  }

  // ✅ 1. STOCK CHECK PEHLE 
  for (const item of orderItems) {
    const product = await Product.findById(item.product);

    if (!product) {
      res.status(404);
      throw new Error("Product not found");
    }

    // 👇 YAHAN LAGANA HAI CHECK
    if (product.countInStock < item.qty) {
      res.status(400);
      throw new Error(`Not enough stock for ${product.name}`);
    }
  }

  // ✅ 2. ORDER CREATE KARO (jab stock confirm ho jaye)
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

  const createdOrder = await order.save();

  // ✅ 3. AB STOCK MINUS KARO
  for (const item of orderItems) {
    const product = await Product.findById(item.product);
    if (product) {
      product.countInStock -= item.qty;
      await product.save();
    }
  }

  res.status(201).json(createdOrder);
});

export const getOrderById = asyncHandler(async (req: any, res: Response) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name email');

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // 🔒 Check: user apna hi order dekh raha hai?
  if (order.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
    res.status(401);
    throw new Error('Not authorized to view this order');
  }

  res.json(order);
});

// @desc    Update order to paid
// @route   PUT /api/orders/:id/pay
// @access  Private
export const updateOrderToPaid = asyncHandler(async (req: any, res: Response) => {
  const order = await Order.findById(req.params.id);

  if (order) {
    order.isPaid = true;
    order.paidAt = new Date();
    // Ye data asal mein PayPal/Stripe se aata hai
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time,
      email_address: req.body.email_address,
    };

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});


// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
export const getMyOrders = asyncHandler(async (req: any, res: Response) => {
  const orders = await Order.find({ user: req.user._id });
  res.json(orders);
});