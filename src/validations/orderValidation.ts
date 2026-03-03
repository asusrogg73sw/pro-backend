import { z } from "zod";

export const createOrderSchema = z.object({
  body: z.object({
    orderItems: z
      .array(
        z.object({
          name: z.string(),
          qty: z.number(),
          image: z.string(),
          price: z.number(),
          product: z.string(), // Product ID as string
        }),
      )
      .min(1, "Order items cannot be empty"),
    shippingAddress: z.object({
      address: z.string(),
      city: z.string(),
      postalCode: z.string(),
      country: z.string(),
    }),
    paymentMethod: z.string(),
    itemsPrice: z.number(),
    shippingPrice: z.number(),
    taxPrice: z.number(),
    totalPrice: z.number(),
  }),
});
