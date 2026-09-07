import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import authRoutes from "./routes/authRoutes.js";

const app = express();

app.use(helmet());
app.use(
    cors({
        origin: process.env.CLIENT_URL,
        credentials: true
    })
);

app.use(express.json({limit: '10kb'}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if(process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Root route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ShopSphere Auth Service is running",
  });
});

// Health-check route
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    service: "auth-service",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

app.use("/auth", authRoutes);

// Undefined route
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error(error);

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Internal server error",
  });
});

export default app;