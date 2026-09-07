import express from 'express';
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import authProxy from './proxies/authProxy.js';
import productProxy from "./proxies/productProxy.js";
import authenticateProductMutation from "./middlewares/authenticateProductMutation.js";

const app = express();
app.set("trust proxy", true);

app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}))

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
    ;
}
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 500,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message:{
        success: false,
        message: "Too many requests, please try again later."
    }
});

app.use('/api/', apiLimiter);
app.use("/api/auth", authProxy);
app.use(
  "/api/products",
  authenticateProductMutation,
  productProxy
);


app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ShopSphere API Gateway is running",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    service: "api-gateway",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Gateway route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((error, req, res, next) => {
  console.error("Gateway error:", error.message);

  res.status(500).json({
    success: false,
    message: "API Gateway error",
  });
});

export default app;