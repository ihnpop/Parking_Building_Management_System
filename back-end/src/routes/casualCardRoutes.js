/**
 * casualCardRoutes.js
 * Định nghĩa các routes (đường dẫn API) phục vụ Nhật ký thẻ lượt.
 */

import express from "express";
import {
    getCasualCardLog,
    getCasualTotalRevenue,
} from "../controllers/casualCardController.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

// Tất cả endpoints đều yêu cầu đăng nhập hợp lệ
router.get("/sessions", verifyToken, getCasualCardLog);
router.get("/revenue",  verifyToken, getCasualTotalRevenue);

export default router;
