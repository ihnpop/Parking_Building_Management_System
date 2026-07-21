import express from "express";
import { loginHandler } from "../controllers/loginController.js";

const router = express.Router();

/**
 * Khi mount tại /api/auth  → POST /api/auth/login
 * Khi mount tại /api/login → POST /api/login  (tương thích ngược)
 */
router.post("/login", loginHandler);  // /api/auth/login
router.post("/", loginHandler);       // /api/login (frontend đang gọi path này)

export default router;