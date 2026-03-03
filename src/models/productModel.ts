import { Schema, model, Types, Document } from "mongoose";

/* ================= REVIEW INTERFACE ================= */
interface IReview {
  name: string;
  rating: number;
  comment: string;
  user: Types.ObjectId;
}

/* ================= PRODUCT INTERFACE ================= */
export interface IProduct extends Document {
  user: Types.ObjectId;
  name: string;
  image: string;
  description: string;
  price: number;
  category: string;
  countInStock: number;
  reviews: IReview[];
  rating: number;
  numReviews: number;
}

/* ================= REVIEW SCHEMA ================= */
const reviewSchema = new Schema<IReview>(
  {
    name: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  },
  { timestamps: true }, 
);

/* ================= PRODUCT SCHEMA ================= */
const productSchema = new Schema<IProduct>(
  {
    user: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    image: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    category: {
      type: String,
      required: true,
    },

    countInStock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    reviews: [reviewSchema],

    rating: {
      type: Number,
      default: 0,
    },

    numReviews: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

/* ================= INDEX FOR SEARCH ================= */
productSchema.index({ name: "text" });

const Product = model<IProduct>("Product", productSchema);
export default Product;
