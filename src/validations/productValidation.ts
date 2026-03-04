import { z } from "zod";

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(3),
    description: z.string().min(10),
    price: z.coerce.number().positive(),
    category: z.string(),
    countInStock: z.coerce.number().int().nonnegative(),
    image: z.string().min(1, "Image path is required"),
  }),
});

export const createReviewSchema = z.object({
  body: z.object({
    rating: z.coerce
      .number()
      .min(1, "Rating minimum 1 honi chahiye")
      .max(5, "Rating maximum 5 ho sakti hai"),

    comment: z
      .string()
      .trim()
      .min(3, "Comment kam az kam 3 characters ka hona chahiye")
      .max(500, "Comment bohat lamba hai"),
  }),
});
