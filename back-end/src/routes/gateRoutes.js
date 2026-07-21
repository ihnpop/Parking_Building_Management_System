import express from "express";
import upload from "../middlewares/upload.js";
import * as gateController from "../controllers/gateController.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

/**
 * POST /api/gate/upload
 * Tải ảnh chụp từ camera lên Storage (yêu cầu đăng nhập)
 */
router.post("/upload", verifyToken, upload.single("file"), gateController.uploadImage);

/**
 * POST /api/gate/ocr
 * Nhận dạng biển số xe qua OCR (yêu cầu đăng nhập)
 */
router.post("/ocr", verifyToken, upload.single("file"), gateController.simulateOCR);

/**
 * POST /api/gate/entry/pre-check
 * Kiểm tra thông tin xe trước khi vào (yêu cầu đăng nhập)
 */
router.post("/entry/pre-check", verifyToken, gateController.preCheckEntry);

/**
 * POST /api/gate/entry
 * Check-in xe vào bãi (yêu cầu đăng nhập)
 */
router.post("/entry", verifyToken, gateController.entryTap);

/**
 * GET /api/gate/check-exit?plate_number=xxx
 * Kiểm tra thông tin xe ra + tính phí, KHÔNG tạo payment (yêu cầu đăng nhập)
 */
router.get("/check-exit", verifyToken, gateController.checkExit);

/**
 * POST /api/gate/exit/pre-check
 * Kiểm tra thông tin xe trước khi ra (yêu cầu đăng nhập)
 */
router.post("/exit/pre-check", verifyToken, gateController.preCheckExit);

/**
 * POST /api/gate/exit
 * Check-out xe ra khỏi bãi (yêu cầu đăng nhập)
 */
router.post("/exit", verifyToken, gateController.exitTap);

/**
 * GET /api/gate/stats
 * Thống kê bãi xe (yêu cầu đăng nhập)
 */
router.get("/stats", verifyToken, gateController.getStats);

/**
 * GET /api/gate/sessions
 * Danh sách phiên gửi xe (yêu cầu đăng nhập)
 */
router.get("/sessions", verifyToken, gateController.getSessions);

export default router;
