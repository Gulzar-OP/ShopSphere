import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { requireInternalKey } from "../middlewares/internalAuthMiddleware.js";

const router = express.Router();

router.get(
  "/verify",
  requireInternalKey,
  protect,
  (req, res) => {
    return res.status(200).json({
      success: true,
      user: {
        id: req.user._id.toString(),
        role: req.user.role,
      },
    });
  }
);

export default router;