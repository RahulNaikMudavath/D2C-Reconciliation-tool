import { getAuditLogs } from "../services/auditService.js";

export async function fetchAuditLogs(req, res, next) {
  try {
    const logs = await getAuditLogs();

    return res.status(200).json({
      success: true,
      totalLogs: logs.length,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
}