import express from "express";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  startReconciliation,
  getReconciliationResults,
} from "../controllers/reconciliationController.js";

const router = express.Router();

router.post(
  "/run",
  authenticate,
  authorizeRoles("FINANCE_EXECUTIVE", "CO_FOUNDER"),
  startReconciliation
);
router.get(
  "/",
  authenticate,
  authorizeRoles("FINANCE_EXECUTIVE", "CO_FOUNDER"),
  getReconciliationResults
);

export default router;