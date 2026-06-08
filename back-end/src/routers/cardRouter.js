import express from "express";
import * as controller from "../controllers/cardController.js";

const router = express.Router();

router.get("/", controller.getCards);
router.get("/month", controller.getMonthCards);
router.get("/lost", controller.getLostCards);
router.get("/month-logs", controller.getMonthCardLogs);

export default router;