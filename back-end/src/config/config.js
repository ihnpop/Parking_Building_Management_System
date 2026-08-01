/**
 * config.js
 * Quản lý tập trung các cấu hình hằng số và biến môi trường của hệ thống Backend.
 * Giúp loại bỏ hardcode và dễ dàng tùy chỉnh theo từng môi trường.
 */

export const config = {
  // ─── Kết nối dịch vụ ngoài (đọc từ .env) ────────────────────────────────
  frontendUrl: process.env.FRONTEND_URL,
  vnptDomain: process.env.VNPT_DOMAIN,
  vnpayHost: process.env.VNPAY_HOST,

  // ─── Giới hạn nghiệp vụ (có thể override bằng .env nếu cần) ────────────
  maxMonthCards:         Number(process.env.MAX_MONTH_CARDS)         || 100,
  maxLoginFailures:      Number(process.env.MAX_LOGIN_FAILURES)      || 3,
  paymentTimeoutMinutes: Number(process.env.PAYMENT_TIMEOUT_MINUTES) || 15,
  contractExpireDays:    Number(process.env.CONTRACT_EXPIRE_DAYS)    || 7,
};

export default config;
