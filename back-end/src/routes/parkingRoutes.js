import express from "express";
import upload from "../middlewares/upload.js";
import * as parkingController from "../controllers/parkingController.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

/**
 * POST /api/parking/open-gate-free
 * Mở barie miễn phí khi phí = 0
 */
router.post("/open-gate-free", verifyToken, parkingController.openGateFree);

/**
 * POST /api/parking/check-in
 *
 * Multer xử lý hai field:
 *   - vehicleImage (tối đa 1 file)
 *   - plateImage   (tối đa 1 file)
 */
router.post(
  "/check-in",
  upload.fields([
    { name: "vehicleImage", maxCount: 1 },
    { name: "plateImage", maxCount: 1 },
  ]),
  parkingController.checkIn
);

/**
 * POST /api/parking/check-out
 */
router.post(
  "/check-out",
  upload.fields([
    { name: "vehicleImage", maxCount: 1 },
    { name: "plateImage", maxCount: 1 },
  ]),
  parkingController.checkOut
);

export default router;
