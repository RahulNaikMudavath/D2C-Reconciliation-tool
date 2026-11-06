
import { z } from "zod";

export const assignClaimSchema = z.object({
  ownerId: z.string().uuid("Invalid user ID"),
});
