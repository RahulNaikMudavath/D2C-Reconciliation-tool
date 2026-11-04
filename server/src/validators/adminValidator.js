import { z } from "zod";

export const adminSetupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().transform(
    (value) => value.toLowerCase()
  ),
  password: z.string().min(12).max(72),
  setupKey: z.string().min(1),
}).strict();

