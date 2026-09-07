import express from "express";
import {
  createProduct,
  getProducts,
  getProductBySlug,
  updateProduct,
  archiveProduct,
  permanentlyDeleteProduct,
} from "../controllers/productController.js";
import { requireAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router
  .route("/")
  .get(getProducts)
  .post(requireAdmin, createProduct);

router.patch(
  "/admin/:id",
  requireAdmin,
  updateProduct
);

router.delete(
  "/admin/:id",
  requireAdmin,
  archiveProduct
);

router.delete(
  "/admin/:id/permanent",
  requireAdmin,
  permanentlyDeleteProduct
);

router.get("/:slug", getProductBySlug);

export default router;