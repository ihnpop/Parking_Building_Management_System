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
