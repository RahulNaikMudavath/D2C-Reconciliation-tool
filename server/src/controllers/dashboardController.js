import { getDashboardSummary } from "../services/dashboardService.js";

export async function fetchDashboardSummary(req, res, next) {
  try {
    const summary = await getDashboardSummary();

    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
}