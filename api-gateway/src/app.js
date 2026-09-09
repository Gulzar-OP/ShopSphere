import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import authProxy from "./proxies/authProxy.js";
import productProxy from "./proxies/productProxy.js";
import inventoryProxy from "./proxies/inventoryProxy.js";

import authenticateMutation from "./middlewares/authenticateMutation.js";
import orderProxy from "./proxies/orderProxy.js";
import authenticateRequest from "./middlewares/authenticateRequest.js";

const app = express();

app.set("trust proxy", 1);

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many requests, please try again later.",
  },
});

app.use("/api", apiLimiter);

// Auth routes are handled by Auth Service
app.use("/api/auth", authProxy);

// GET requests public; POST/PATCH/DELETE verified
app.use(
  "/api/products",
  authenticateMutation,
  productProxy
);

app.use(
  "/api/inventory",
  authenticateMutation,
  inventoryProxy
);

app.use(
  "/api/orders",
  authenticateRequest,
  orderProxy
);

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "ShopSphere API Gateway is running",
  });
});

app.get("/health", (req, res) => {
  return res.status(200).json({
    success: true,
    service: "api-gateway",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: `Gateway route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((error, req, res, next) => {
  console.error("Gateway error:", error.message);

  return res.status(500).json({
    success: false,
    message: "API Gateway error",
  });
});

export default app;