
import express from "express";
import { uploadImportFile } from "../controllers/importController.js";
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

export default router;
