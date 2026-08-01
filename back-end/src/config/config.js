/**
 * config.js
 * Quản lý tập trung các cấu hình hằng số và biến môi trường của hệ thống Backend.
 * Giúp loại bỏ hardcode và dễ dàng tùy chỉnh theo từng môi trường.
 */

export const config = {
  // Frontend URL
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",

  // VNPT eKYC
  vnptDomain: process.env.VNPT_DOMAIN || "https://api.idg.vnpt.vn",

  // VNPAY
  vnpayHost: process.env.VNPAY_HOST || "https://sandbox.vnpayment.vn",

  // Phí dịch vụ mặc định
  defaultCardReissueFee: Number(process.env.DEFAULT_CARD_REISSUE_FEE) || 50000,

  // Giới hạn nghiệp vụ
  maxMonthCards: Number(process.env.MAX_MONTH_CARDS) || 50,
  maxLoginFailures: Number(process.env.MAX_LOGIN_FAILURES) || 3,
  paymentTimeoutMinutes: Number(process.env.PAYMENT_TIMEOUT_MINUTES) || 15,
  contractExpireDays: Number(process.env.CONTRACT_EXPIRE_DAYS) || 7,
};

export default config;
