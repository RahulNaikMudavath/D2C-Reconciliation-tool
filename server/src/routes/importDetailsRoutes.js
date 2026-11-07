import express from "express";
import { fetchImportDetails } from "../controllers/importDetailsController.js";
import {
  authenticate,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/:importBatchId",
  authenticate,
  authorizeRoles("FINANCE_EXECUTIVE", "CO_FOUNDER"),
  fetchImportDetails
);

export default router;