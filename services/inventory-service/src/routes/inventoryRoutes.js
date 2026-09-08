import express from "express";
import {
  createInventory,
  getStockBySku,
  updateInventory,
  adjustStock,
} from "../controllers/inventoryController.js";
import { requireAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  requireAdmin,
  createInventory
);

router.post(
  "/:sku/adjust",
  requireAdmin,
  adjustStock
);

router.patch(
  "/:sku",
  requireAdmin,
  updateInventory
);

router.get(
  "/:sku",
  getStockBySku
);

export default router;