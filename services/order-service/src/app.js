import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import orderRoutes from "./routes/orderRoutes.js";

import {
  isRabbitMQConnected,
} from "./config/rabbitmq.js";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message:
      "ShopSphere Order Service is running",
  });
});

app.use("/orders", orderRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    service: "order-service",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((error, req, res, next) => {
  console.error("Order Service error:", error);

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: `Invalid ${error.path}: ${error.value}`,
    });
  }

  if (error.name === "ValidationError") {
    const errors = Object.values(
      error.errors
    ).map((validationError) => {
      return validationError.message;
    });

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
        "An order with this value already exists",
    });
  }

  return res
    .status(error.statusCode || 500)
    .json({
      success: false,
      message:
        error.message || "Internal server error",
      ...(error.details && {
        errors: error.details,
      }),
    });
});

export default app;