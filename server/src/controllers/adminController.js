
import { adminSetupSchema } from "../validators/adminValidator.js";
import { createCofounder } from "../services/adminService.js";

export async function setupCofounder(req, res, next) {
  try {
    const validation = adminSetupSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const result = await createCofounder(validation.data);

    return res.status(201).json({
      success: true,
      message: "Co-founder account created successfully",
      data: result,
    });
  } catch (error) {
    if (error.message === "INVALID_SETUP_KEY") {
      return res.status(403).json({
        success: false,
        message: "Invalid setup credentials",
      });
    }

    if (error.message === "COFOUNDER_ALREADY_EXISTS") {
      return res.status(409).json({
        success: false,
        message: "A Co-founder account already exists",
      });
    }

    if (error.message === "EMAIL_ALREADY_EXISTS") {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    if (error.message === "COFOUNDER_SETUP_CONFLICT") {
      return res.status(409).json({
        success: false,
        message: "Setup conflict. Please retry the request.",
      });
    }

    next(error);
  }
}
