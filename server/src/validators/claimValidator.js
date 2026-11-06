
import { z } from "zod";

export const updateClaimStatusSchema = z.object({
  status: z.enum([
    "OPEN",
    "IN_REVIEW",
    "RESOLVED",
    "REJECTED",
  ]),
});
