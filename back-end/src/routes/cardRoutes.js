import express from "express";
import * as controller from "../controllers/cardController.js";

const router = express.Router();

router.get("/card", controller.getCards);
router.get("/lost-card", controller.getLostCards);
router.get('/lost-logs', controller.getLostLogs);

// Đăng ký các API cho việc quản lý mất thẻ
router.post('/lost-card', controller.createLostCard);
router.post("/card", controller.createCard);
router.delete("/:id", controller.deleteCard);

router.put("/:id", controller.updateCard);
export default router;