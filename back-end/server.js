import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

// ─── Routes ─────────────────────────────────────────────────────────────────
import authRouter from "./src/routes/authRoutes.js";
import cardRouter from "./src/routes/cardRoutes.js";
import userRouter from "./src/routes/userRoutes.js";
import parkingRouter from "./src/routes/parkingRoutes.js";
import registrationRouter from "./src/routes/parkingRegistrationRoutes.js";
import gateRouter from "./src/routes/gateRoutes.js";
import monthCardRouter from "./src/routes/monthCardRoutes.js";
import paymentRoutes from "./src/routes/paymentRoutes.js";
import contractRouter from "./src/routes/contractRoutes.js";
import dashboardRouter from "./src/routes/dashboardRoutes.js";
import casualCardRouter from "./src/routes/casualCardRoutes.js";
import priceRouter from "./src/routes/priceRoutes.js";

// ─── Middlewares ────────────────────────────────────────────────────────────
import errorHandler from "./src/middlewares/errorHandler.js";

// ─── App Setup ──────────────────────────────────────────────────────────────
const app = express();

app.set("trust proxy", true);

// ─── CORS ───────────────────────────────────────────────────────────────────
app.use(cors());



// ─── Body parsers ───────────────────────────────────────────────────────────
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ─── API Routes ─────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);            // POST /api/auth/login
app.use("/api/login", authRouter);           // Tương thích ngược (frontend gọi /api/login)
app.use("/api/cards", cardRouter);
app.use("/api/users", userRouter);
app.use("/api/parking", parkingRouter);
app.use("/api/parking", registrationRouter);
app.use("/api/gate", gateRouter);
app.use("/api/month-card", monthCardRouter);
app.use("/api/payments", paymentRoutes);
app.use("/api/contracts", contractRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/casual-card", casualCardRouter);
app.use("/api/prices", priceRouter);

// ─── Health check ───────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ─── Global error handler (phải đặt SAU tất cả routes) ─────────────────────
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────────────────────────
const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server running at port ${PORT}`);

  // Tự động chạy Expiry Job để cập nhật các gói hết hạn (BR-11)
  import("./src/service/renewalService.js")
    .then(({ runExpiryJob }) => {
      // Chạy lần đầu sau 5 giây khi server start
      setTimeout(() => {
        runExpiryJob().catch((err) => console.error("[ExpiryJob] Lỗi:", err.message));
      }, 5000);
      // Lặp lại mỗi 24 giờ
      setInterval(() => {
        runExpiryJob().catch((err) => console.error("[ExpiryJob] Lỗi:", err.message));
      }, 24 * 60 * 60 * 1000);
    })
    .catch((err) => console.error("[ExpiryJob] Không thể import renewalService:", err.message));

  // Kích hoạt Cron job tự động hủy giao dịch thanh toán quá hạn 10 phút
  import("./src/jobs/paymentExpiry.job.js")
    .then(({ startPaymentExpiryJob }) => {
      startPaymentExpiryJob();
    })
    .catch((err) => console.error("[PaymentExpiryJob] Không thể import:", err.message));
});
