
import { Router } from "express";
import { setupCofounder } from "../controllers/adminController.js";
import { authorizeRoles } from "../middleware/authMiddleware.js";

import {
  register,
  login,
  getMe,
} from "../controllers/authController.js";

import { authenticate } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);

// Protected route
router.get("/me", authenticate, getMe);
// Accessible to both roles
router.get(
  "/finance-access",
  authenticate,
  authorizeRoles("FINANCE_EXECUTIVE", "CO_FOUNDER"),
  (req, res) => {
    res.json({
      success: true,
      message: "Finance access granted",
      role: req.user.role,
    });
  }
);

// Accessible only to Co-founder
router.get(
  "/cofounder-access",
  authenticate,
  authorizeRoles("CO_FOUNDER"),
  (req, res) => {
    res.json({
      success: true,
      message: "Co-founder access granted",
      role: req.user.role,
    });
  }
);
if (process.env.NODE_ENV !== "production") {
  router.post("/setup-cofounder", setupCofounder);
}

export default router;
