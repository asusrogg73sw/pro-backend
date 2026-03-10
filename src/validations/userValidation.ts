import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(3, "Name kam az kam 3 characters ka ho")
      .transform((val: string) => val.trim()),

    email: z
      .string()
      .email("Sahi email address dalein")
      .transform((val: string) => val.toLowerCase()),

    password: z.string().min(6, "Password kam az kam 6 characters ka ho"),

    age: z.coerce.number().min(18, "Age kam az kam 18 honi chahiye"),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email("Sahi email address dalein")
      .transform((val: string) => val.toLowerCase()),

    password: z.string().min(6, "Password kam az kam 6 characters ka ho"),
  }),
});
