
import express from "express";

import {
  createChannelRateCard,
  createCourierRateCard,
  getAllRateCards,
  getExpectedSettlement,
  getExpectedFreight,
} from "../controllers/rateCardController.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(
  authenticate,
  authorizeRoles("FINANCE_EXECUTIVE", "CO_FOUNDER")
);

router.get("/", getAllRateCards);

router.post("/channel", createChannelRateCard);
router.post("/courier", createCourierRateCard);

router.post("/calculate-settlement", getExpectedSettlement);
router.post("/calculate-freight", getExpectedFreight);

export default router;
