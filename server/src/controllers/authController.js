
import {
  registerUser,
  loginUser,
} from "../services/authService.js";

import {
  registerSchema,
  loginSchema,
} from "../validators/authValidator.js";

export async function register(req, res, next) {
  try {
    const validation = registerSchema.safeParse(req.body);

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

    const result = await registerUser(validation.data);

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: result,
    });
  } catch (error) {
    if (error.message === "An account with this email already exists") {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const validation = loginSchema.safeParse(req.body);

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

    const result = await loginUser(validation.data);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    if (error.message === "Invalid email or password") {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    next(error);
  }
}


export async function getMe(req, res) {
  return res.status(200).json({
    success: true,
    message: "User profile fetched successfully",
    data: {
      user: req.user,
    },
  });
}
