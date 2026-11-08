import express from "express";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { processFreightImportController } from "../controllers/freightProcessingController.js";

const router = express.Router();

router.post(
  "/:importBatchId/process",
  authenticate,
  authorizeRoles("FINANCE_EXECUTIVE", "CO_FOUNDER"),
  processFreightImportController
);

export default router;
