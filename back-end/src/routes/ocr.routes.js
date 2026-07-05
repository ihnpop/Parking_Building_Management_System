import express from "express";
import upload from "../middlewares/upload.js";
import * as controller from "../controllers/ocr.controller.js";

const router = express.Router();

router.post(
  "/read",
  upload.single("file"),
  controller.readPlate
);

export default router;