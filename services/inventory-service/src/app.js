import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import { isRabbitMQConnected } from "./config/rabbitmq.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import internalInventoryRoutes from "./routes/internalInventoryRoutes.js";
const app = express();

// Security middleware
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

// Body parsers
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logger
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Root route
app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "ShopSphere Inventory Service is running",
  });
});

// Health-check route
app.get("/health", (req, res) => {
  const databaseHealthy =
    mongoose.connection.readyState === 1;

  const rabbitMQHealthy =
    isRabbitMQConnected();

  const healthy =
    databaseHealthy && rabbitMQHealthy;

  return res.status(healthy ? 200 : 503).json({
    success: healthy,
    service: "inventory-service",
    status: healthy ? "healthy" : "unhealthy",
    dependencies: {
      mongodb: databaseHealthy
        ? "connected"
        : "disconnected",

      rabbitmq: rabbitMQHealthy
        ? "connected"
        : "disconnected",
    },
    timestamp: new Date().toISOString(),
  });
});

// Business routes
app.use("/inventory", inventoryRoutes);
app.use(
  "/internal",
  internalInventoryRoutes
);

// 404 middleware
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("Inventory Service error:", error);

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: `Invalid ${error.path}: ${error.value}`,
    });
  }

  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map(
      (validationError) =>
        validationError.message
    );

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message:
        "An inventory record with this value already exists",
    });
  }

  return res
    .status(error.statusCode || 500)
    .json({
      success: false,
      message:
        error.message || "Internal server error",
    });
});

export default app;