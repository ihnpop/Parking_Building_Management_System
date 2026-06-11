import express from "express";
import * as controller from "../controllers/cardController.js";

const router = express.Router();

router.get("/card", controller.getCards);
router.get("/month-card", controller.getMonthCards);
router.get("/lost-card", controller.getLostCards);
router.get("/month-card-logs", controller.getMonthCardLogs);

export default router;