
import express from "express";
import {
  uploadImportFile,
  suggestMappings,
  approveMapping,
  rejectMapping,
} from "../controllers/importController.js";
import { upload } from "../middleware/uploadMiddleware.js";
import {
  authenticate,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/upload",
  authenticate,
  authorizeRoles("FINANCE_EXECUTIVE", "CO_FOUNDER"),
  upload.single("file"),
  uploadImportFile
);

router.post(
  "/suggest-mappings",
  authenticate,
  authorizeRoles("FINANCE_EXECUTIVE", "CO_FOUNDER"),
  suggestMappings
);

router.patch(
  "/mappings/:mappingId/approve",
  authenticate,
  authorizeRoles("FINANCE_EXECUTIVE", "CO_FOUNDER"),
  approveMapping
);

router.patch(
  "/mappings/:mappingId/reject",
  authenticate,
  authorizeRoles("FINANCE_EXECUTIVE", "CO_FOUNDER"),
  rejectMapping
);

export default router;
