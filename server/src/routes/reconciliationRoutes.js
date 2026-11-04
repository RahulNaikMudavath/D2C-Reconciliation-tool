import express from "express";
import { startReconciliation } from "../controllers/reconciliationController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/run",
  authenticate,
  authorizeRoles("FINANCE_EXECUTIVE", "CO_FOUNDER"),
  startReconciliation
);

export default router;