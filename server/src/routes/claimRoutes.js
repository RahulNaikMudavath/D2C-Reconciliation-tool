import express from "express";
import {
  createClaims,
  fetchClaims,
  changeClaimStatus,
} from "../controllers/claimController.js";
import {
  authenticate,
  authorizeRoles,
} from "../middleware/authMiddleware.js";
import { assignClaim } from "../controllers/claimController.js";

const router = express.Router();

router.post(
  "/generate",
  authenticate,
  authorizeRoles("FINANCE_EXECUTIVE", "CO_FOUNDER"),
  createClaims
);

router.get(
  "/",
  authenticate,
  authorizeRoles("FINANCE_EXECUTIVE", "CO_FOUNDER"),
  fetchClaims
);

router.patch(
  "/:claimId/status",
  authenticate,
  authorizeRoles("FINANCE_EXECUTIVE", "CO_FOUNDER"),
  changeClaimStatus
);

router.patch(
  "/:claimId/assign",
  authenticate,
  authorizeRoles("FINANCE_EXECUTIVE", "CO_FOUNDER"),
  assignClaim
);

export default router;
