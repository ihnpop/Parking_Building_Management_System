import express from "express";
import * as controller from "../controllers/cardController.js";
import * as lostController from "../controllers/lostCardController.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

// Đọc dữ liệu: chỉ yêu cầu đăng nhập, không giới hạn role cụ thể
// (nhân viên nào cũng cần xem được danh sách thẻ / nhật ký mất thẻ)
router.get("/card", controller.getCards);
router.get("/lost-card", lostController.getLostCards);
router.get('/lost-logs', lostController.getLostLogs);

// Đăng ký các API cho việc quản lý mất thẻ (cần xác thực để lấy performedBy)
router.post('/lost-card', verifyToken, lostController.createLostCard);
router.put('/lost-card/:reportId/accept', verifyToken, lostController.acceptLostCard);
router.put('/lost-card/:reportId/resolve', verifyToken, lostController.resolveLostCard);


router.post("/card", controller.createCard);

router.delete("/:id", controller.deleteCard);
router.put("/:id", controller.updateCard);
export default router;