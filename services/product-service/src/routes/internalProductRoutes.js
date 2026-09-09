import express from "express";

import {
  validateOrderItems,
} from "../controllers/internalProductController.js";

import {
  requireInternalKey,
} from "../middlewares/internalAuthMiddleware.js";

const router = express.Router();

router.use(requireInternalKey);

router.post(
  "/products/validate",
  validateOrderItems
);

export default router;