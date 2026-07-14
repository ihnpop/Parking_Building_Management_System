import express from "express";
import upload from "../middlewares/upload.js";
import * as gateController from "../controllers/gateController.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

/**
 * POST /api/gate/upload
 * Tải ảnh chụp từ camera lên Storage
 */
router.post("/upload", upload.single("file"), gateController.uploadImage);

/**
 * POST /api/gate/ocr
 * Giả lập OCR quét biển số
 */
router.post("/ocr", upload.single("file"), gateController.simulateOCR);

/**
 * POST /api/gate/entry/pre-check
 */
router.post("/entry/pre-check", gateController.preCheckEntry);

/**
 * POST /api/gate/entry
 */
router.post("/entry", verifyToken, gateController.entryTap);

/**
 * GET /api/gate/check-exit?plate_number=xxx
 * Kiểm tra thông tin xe ra + tính phí, KHÔNG tạo payment.
 * Dùng cho panel XE RA trước khi chọn phương thức thanh toán.
 */
router.get("/check-exit", gateController.checkExit);

/**
 * POST /api/gate/exit/pre-check
 */
router.post("/exit/pre-check", gateController.preCheckExit);

/**
 * POST /api/gate/exit
 */
router.post("/exit", verifyToken, gateController.exitTap);

/**
 * GET /api/gate/stats
 */
router.get("/stats", gateController.getStats);

/**
 * GET /api/gate/sessions
 */
router.get("/sessions", gateController.getSessions);

export default router;
