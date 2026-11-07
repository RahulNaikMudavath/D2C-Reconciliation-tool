import { getFinanceTeam } from "../services/teamService.js";

export async function fetchFinanceTeam(req, res, next) {
  try {
    const users = await getFinanceTeam();

    return res.status(200).json({
      success: true,
      totalUsers: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
}

