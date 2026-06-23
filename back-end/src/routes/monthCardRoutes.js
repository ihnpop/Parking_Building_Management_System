import express from "express";
import * as monthCardController from "../controllers/monthCardController.js";

const router = express.Router();

/**
 * GET /api/month-card
 * Lấy danh sách thẻ tháng
 */
router.get("/", monthCardController.getMonthCards);

/**
 * GET /api/month-card/logs
 * Lấy lịch sử giao dịch thẻ tháng
 */
router.get("/logs", monthCardController.getMonthCardLogs);

/**
 * GET /api/month-card/renew-packages
 * Lấy danh sách các gói gia hạn thẻ tháng khả dụng
 */
router.get("/renew-packages", monthCardController.getRenewPackages);


/**
 * POST /api/month-card/renew
 * Thực hiện gia hạn thẻ tháng
 */
router.post("/renew", monthCardController.renewMonthlyCard);

/**
 * PUT /api/month-card/:id
 * Cập nhật thông tin thẻ tháng
 */
router.put("/:id", monthCardController.updateMonthCard);

/**
 * POST /api/month-card/create
 * Tạo mới thẻ tháng (đăng ký mới)
 */
router.post("/create", monthCardController.createMonthCard);

export default router;
