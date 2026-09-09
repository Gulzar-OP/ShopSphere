import express from "express";
import {
  createOrder,
  getMyOrders,
  getMyOrderById,
  cancelMyOrder,
} from "../controllers/orderController.js";

const router = express.Router();

// Create new order
router.post("/", createOrder);

// Logged-in user ke saare orders
router.get("/", getMyOrders);

// Logged-in user ka single order
router.get("/:orderId", getMyOrderById);

router.patch(
  "/:orderId/cancel",
  cancelMyOrder
);



export default router;