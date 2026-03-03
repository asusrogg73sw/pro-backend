import { Request, Response } from "express";
import { Types } from "mongoose";
import Product from "../models/productModel";
import asyncHandler from "../middlewares/asyncHandler";

/* ===== Custom Auth Request (ONLY for this file) ===== */
interface AuthRequest extends Request {
  user: {
    _id: Types.ObjectId;
    name: string;
    email: string;
  };
}

/* ================= CREATE PRODUCT ================= */
export const createProduct = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { name, image, description, price, category, countInStock } =
      req.body;

    const product = new Product({
      user: req.user._id, // Admin ID
      name,
      image,
      description,
      price,
      category,
      countInStock,
    });

    const createdProduct = await product.save();
    await createdProduct.populate("user", "name email");

    res.status(201).json(createdProduct);
  },
);

/* ================= GET PRODUCTS (Search + Pagination) ================= */
export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const pageSize = 10;
  const page = Number(req.query.pageNumber) || 1;

  let query: any = {};

  if (req.query.keyword) {
    query.name = { $regex: req.query.keyword, $options: "i" };
  }

  if (req.query.category) {
    query.category = req.query.category;
  }

  const count = await Product.countDocuments(query);

  const products = await Product.find(query)
    .populate("user", "name email")
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({
    products,
    page,
    pages: Math.ceil(count / pageSize),
    total: count,
  });
});

/* ================= CREATE REVIEW ================= */
export const createProductReview = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { rating, comment } = req.body;

    const product = await Product.findById(req.params.id).populate(
      "user",
      "name email",
    );

    if (!product) {
      res.status(404);
      throw new Error("Product not found");
    }

    const alreadyReviewed = product.reviews.find(
      (r: any) => r.user.toString() === req.user._id.toString(),
    );

    if (alreadyReviewed) {
      res.status(400);
      throw new Error("Product already reviewed");
    }

    const review = {
      name: req.user.name,
      rating: Number(rating),
      comment,
      user: req.user._id,
    };

    product.reviews.push(review as any);

    product.numReviews = product.reviews.length;

    product.rating =
      product.reviews.reduce((acc: number, item: any) => acc + item.rating, 0) /
      product.reviews.length;

    const updatedProduct = await product.save();
    await updatedProduct.populate("reviews.user", "name email");

    res.status(201).json(updatedProduct);
  },
);
 