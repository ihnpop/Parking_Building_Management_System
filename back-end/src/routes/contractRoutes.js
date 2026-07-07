import express from "express";
import * as contractController from "../controllers/contractController.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

/**
 * POST /api/contracts/send
 * Gửi email yêu cầu ký hợp đồng (Yêu cầu đăng nhập)
 */
router.post("/send", verifyToken, contractController.sendContractEmail);

/**
 * GET /api/contracts/status/:registrationId
 * Lấy trạng thái hợp đồng theo registrationId (Yêu cầu đăng nhập)
 */
router.get("/status/:registrationId", verifyToken, contractController.getContractStatus);

/**
 * GET /api/contracts/sign/:token
 * Lấy thông tin hợp đồng qua token ký (Công khai)
 */
router.get("/sign/:token", contractController.getContractDetails);

/**
 * POST /api/contracts/sign/:token
 * Đồng ý ký hợp đồng (Công khai)
 */
router.post("/sign/:token", contractController.signContract);

export default router;
