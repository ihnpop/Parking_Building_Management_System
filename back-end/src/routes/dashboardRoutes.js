/**
 * dashboardRoutes.js
 * Định nghĩa các routes (đường dẫn API) phục vụ Dashboard.
 */

import express from "express";
import { 
    getDashboardSummary, 
    getTodayRevenueDetails, 
    getMonthlyRevenueDetails 
} from "../controllers/dashboardController.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

// Tất cả các endpoints của Dashboard đều yêu cầu người dùng phải đăng nhập hợp lệ
router.get("/stats", verifyToken, getDashboardSummary);
router.get("/revenue/today", verifyToken, getTodayRevenueDetails);
router.get("/revenue/month", verifyToken, getMonthlyRevenueDetails);

export default router;
