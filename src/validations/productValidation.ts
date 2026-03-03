import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(3),
    description: z.string().min(10),
    price: z.number().positive(),
    category: z.string(),
    countInStock: z.number().int().nonnegative(),
    image: z.string().min(1, "Image path is required")
  }),
});