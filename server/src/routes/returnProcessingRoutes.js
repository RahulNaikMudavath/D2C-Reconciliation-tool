import express from "express";
import {
  authenticate,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

import {
  processReturnImportController,
} from "../controllers/returnProcessingController.js";

const router = express.Router();

router.post(
  "/:importBatchId/process",
  authenticate,
  authorizeRoles("FINANCE_EXECUTIVE", "CO_FOUNDER"),
  processReturnImportController
);

export default router;
