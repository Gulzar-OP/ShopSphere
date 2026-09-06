import express from "express";
import {
  register,
  login,
  logout,
  getMe,
  adminCheck,
} from "../controllers/authController.js";
import {
  protect,
  authorize,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

router.get("/me", protect, getMe);

router.get(
  "/admin/check",
  protect,
  authorize("admin"),
  adminCheck
);

export default router;