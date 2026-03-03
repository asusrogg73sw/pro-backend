import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(3, "Name kam az kam 3 characters ka ho"),
    email: z.string().email("Sahi email address dalein"),
    password: z.string().min(6, "Password kam az kam 6 characters ka ho"),
    age: z.number().min(18, "Age kam az kam 18 honi chahiye").optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Sahi email address dalein"),
    password: z.string().min(1, "Password zaroori hai"),
  }),
});