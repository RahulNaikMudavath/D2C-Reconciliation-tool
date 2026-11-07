import express from "express";
import { fetchImportHistory } from "../controllers/importHistoryController.js";
import {
  authenticate,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/",
  authenticate,
  authorizeRoles("FINANCE_EXECUTIVE", "CO_FOUNDER"),
  fetchImportHistory
);

export default router;