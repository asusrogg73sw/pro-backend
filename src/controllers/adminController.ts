import { Request, Response } from "express";

import asyncHandler from "../middlewares/asyncHandler";
import Order from "../models/orderModel";
import User from "../models/userModel";
import Product from "../models/productModel";

// @desc    Get Admin Dashboard Stats
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  // 1. Total Orders & Users Count
  const totalOrders = await Order.countDocuments();
  const totalUsers = await User.countDocuments();
  const totalProducts = await Product.countDocuments();

  // 2. Total Revenue (Sum of all totalPrice where isPaid is true)
  const salesData = await Order.aggregate([
    { $match: { isPaid: true } }, // Sirf paid orders uthao
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$totalPrice" },
      },
    },
  ]);

  const totalRevenue = salesData.length > 0 ? salesData[0].totalRevenue : 0;

  res.json({
    totalOrders,
    totalUsers,
    totalProducts,
    totalRevenue,
  });
});

// @desc    Get Top 5 Best Selling Products
// @route   GET /api/admin/top-products
// @access  Private/Admin
export const getTopSellingProducts = asyncHandler(async (req: Request, res: Response) => {
  const topProducts = await Order.aggregate([
    { $match: { isPaid: true } }, // 1. Sirf Paid orders lo
    { $unwind: "$orderItems" },   // 2. Order items ki array ko khol do (har item ek alag document ban jaye)
    {
      $group: {                   // 3. Product ID ke hisab se group karo
        _id: "$orderItems.product",
        name: { $first: "$orderItems.name" },
        totalQty: { $sum: "$orderItems.qty" },
        totalRevenue: { $sum: { $multiply: ["$orderItems.qty", "$orderItems.price"] } }
      }
    },
    { $sort: { totalQty: -1 } },  // 4. Sabse zyada bikne wale upar
    { $limit: 5 }                 // 5. Sirf top 5
  ]);

  res.json(topProducts);
});

// @desc    Get Monthly Sales Data for Charts
// @route   GET /api/admin/monthly-sales
// @access  Private/Admin
export const getMonthlySales = asyncHandler(async (req: Request, res: Response) => {
  const monthlySales = await Order.aggregate([
    { $match: { isPaid: true } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$paidAt" } }, // Date ko "YYYY-MM" format mein group karo
        totalSales: { $sum: "$totalPrice" },
        count: { $sum: 1 }, // Us mahine kitne orders aaye
      },
    },
    { $sort: { _id: 1 } }, // Purane mahine pehle, naye baad mein
  ]);

  res.json(monthlySales);
});