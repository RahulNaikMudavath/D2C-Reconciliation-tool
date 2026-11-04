
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/authRoutes.js";
import reconciliationRoutes from "./routes/reconciliationRoutes.js";
import claimRoutes from "./routes/claimRoutes.js";

const app = express();

// Security headers
app.use(helmet());

// Allow requests from our React frontend
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Parse incoming JSON
app.use(express.json({ limit: "1mb" }));

// Limit repeated requests to authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ReconcileX API is running!",
  });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/reconciliation", reconciliationRoutes);
app.use("/api/claims", claimRoutes);

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

// Centralized error handler
app.use((error, req, res, next) => {
  console.error("Server error:", error);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

export default app;
