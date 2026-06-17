import express from "express";
import { getUsers, updateUserRole } from "../controllers/userController.js";

const router = express.Router();

/**
 * GET /api/users
 * Lấy danh sách tất cả người dùng kèm role
 */
router.get("/", getUsers);

/**
 * PATCH /api/users/:id/role
 * Cập nhật role cho người dùng
 */
router.patch("/:id/role", updateUserRole);

export default router;
