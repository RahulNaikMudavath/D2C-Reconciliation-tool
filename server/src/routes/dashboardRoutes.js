import express from "express";
import { fetchDashboardSummary } from "../controllers/dashboardController.js";
import {
  authenticate,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/",
  authenticate,
  authorizeRoles("FINANCE_EXECUTIVE", "CO_FOUNDER"),
  fetchDashboardSummary
);

export default router;