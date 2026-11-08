
import prisma from "../config/database.js";
import {
  calculateExpectedSettlement,
  calculateExpectedFreight,
} from "../services/rateCardService.js";

// Create a channel commission rate card
export async function createChannelRateCard(req, res, next) {
  try {
    const {
      partnerId,
      channel,
      commissionPercent,
      fixedFee,
      otherFee,
      effectiveFrom,
      effectiveTo,
    } = req.body;

    if (
      !partnerId ||
      !channel ||
      commissionPercent === undefined ||
      fixedFee === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Partner, channel, commission percentage and fixed fee are required.",
      });
    }

    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
    });

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found.",
      });
    }

    const rateCard = await prisma.channelRateCard.create({
      data: {
        partnerId,
        channel,
        commissionPercent,
        fixedFee,
        otherFee: otherFee ?? 0,
        effectiveFrom: effectiveFrom
          ? new Date(effectiveFrom)
          : new Date(),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Channel rate card created successfully.",
      data: rateCard,
    });
  } catch (error) {
    next(error);
  }
}

// Create a courier freight rate card
export async function createCourierRateCard(req, res, next) {
  try {
    const {
      partnerId,
      channel,
      courierName,
      minWeightKg,
      maxWeightKg,
      baseCharge,
      perKgCharge,
      effectiveFrom,
      effectiveTo,
    } = req.body;

    if (
      !partnerId ||
      !channel ||
      !courierName ||
      minWeightKg === undefined ||
      baseCharge === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Partner, channel, courier, minimum weight and base charge are required.",
      });
    }

    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
    });

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found.",
      });
    }

    const rateCard = await prisma.rateCard.create({
      data: {
        partnerId,
        channel,
        courierName,
        minWeightKg,
        maxWeightKg: maxWeightKg ?? null,
        baseCharge,
        perKgCharge: perKgCharge ?? 0,
        effectiveFrom: effectiveFrom
          ? new Date(effectiveFrom)
          : new Date(),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Courier rate card created successfully.",
      data: rateCard,
    });
  } catch (error) {
    next(error);
  }
}

// List channel and courier rate cards
export async function getAllRateCards(req, res, next) {
  try {
    const [channelRateCards, courierRateCards] = await Promise.all([
      prisma.channelRateCard.findMany({
        include: {
          partner: {
            select: { id: true, name: true, type: true },
          },
        },
        orderBy: { effectiveFrom: "desc" },
      }),
      prisma.rateCard.findMany({
        include: {
          partner: {
            select: { id: true, name: true, type: true },
          },
        },
        orderBy: { effectiveFrom: "desc" },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        channelRateCards,
        courierRateCards,
      },
    });
  } catch (error) {
    next(error);
  }
}

// Calculate expected settlement for an order
export async function getExpectedSettlement(req, res, next) {
  try {
    const { partnerId, channel, orderValue, orderDate } = req.body;

    if (
      !partnerId ||
      !channel ||
      orderValue === undefined ||
      Number(orderValue) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid partner, channel and order value are required.",
      });
    }

    const result = await calculateExpectedSettlement({
      partnerId,
      channel,
      orderValue,
      orderDate: orderDate ? new Date(orderDate) : new Date(),
    });

    return res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    next(error);
  }
}

// Calculate expected courier freight
export async function getExpectedFreight(req, res, next) {
  try {
    const {
      partnerId,
      channel,
      courierName,
      weightKg,
      orderDate,
    } = req.body;

    if (
      !partnerId ||
      !channel ||
      !courierName ||
      weightKg === undefined ||
      Number(weightKg) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid partner, channel, courier and weight are required.",
      });
    }

    const result = await calculateExpectedFreight({
      partnerId,
      channel,
      courierName,
      weightKg,
      orderDate: orderDate ? new Date(orderDate) : new Date(),
    });

    return res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    next(error);
  }
}
