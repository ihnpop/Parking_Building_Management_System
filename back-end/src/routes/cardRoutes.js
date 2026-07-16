import express from "express";
import * as controller from "../controllers/cardController.js";
import * as lostController from "../controllers/lostCardController.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

// Đọc dữ liệu: chỉ yêu cầu đăng nhập, không giới hạn role cụ thể
// (nhân viên nào cũng cần xem được danh sách thẻ / nhật ký mất thẻ)
router.get("/card", controller.getCards);
router.get("/month-card", controller.getMonthCards);
router.get("/month-card-logs", controller.getMonthCardLogs);

// Đăng ký các API cho việc quản lý mất thẻ (cần xác thực để lấy performedBy)
router.get("/lost-card", lostController.getLostCards);
router.get('/lost-logs', lostController.getLostLogs);
router.post('/lost-card', verifyToken, lostController.createLostCard);
router.get('/lost-card/history', verifyToken, lostController.getAllHistory);
router.put('/lost-card/:reportId/accept', verifyToken, lostController.acceptLostCard);
router.put('/lost-card/:reportId/resolve', verifyToken, lostController.resolveLostCard);

router.post("/card", controller.createCard);

router.delete("/card/:id", controller.deleteCard);
router.delete("/:id", controller.deleteCard);
router.put("/:id", controller.updateCard);
export default router;