import express from "express";
import {
  reserveStock,
  releaseStock,
  commitStock,
} from "../controllers/internalInventoryController.js";
import { requireInternalKey } from "../middlewares/internalAuthMiddleware.js";

const router = express.Router();

router.use(requireInternalKey);

router.post("/reserve", reserveStock);
router.post("/release", releaseStock);
router.post("/commit", commitStock);

export default router;