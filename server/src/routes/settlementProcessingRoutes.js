
import express from "express";
import {
  processSettlementImportController,
} from "../controllers/settlementProcessingController.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/:importBatchId/process",
  authenticate,
  authorizeRoles("FINANCE_EXECUTIVE", "CO_FOUNDER"),
  processSettlementImportController
);

export default router;
