/**
 * config.js
 * Quản lý tập trung các cấu hình hằng số và biến môi trường của hệ thống Backend.
 * Giúp loại bỏ hardcode và dễ dàng tùy chỉnh theo từng môi trường.
 */

export const config = {
  // Frontend URL
  frontendUrl: process.env.FRONTEND_URL,

  // VNPT eKYC
  vnptDomain: process.env.VNPT_DOMAIN,

  // VNPAY
  vnpayHost: process.env.VNPAY_HOST,

  // Giới hạn nghiệp vụ
  maxMonthCards: Number(process.env.MAX_MONTH_CARDS),
  maxLoginFailures: Number(process.env.MAX_LOGIN_FAILURES),
  paymentTimeoutMinutes: Number(process.env.PAYMENT_TIMEOUT_MINUTES),
  contractExpireDays: Number(process.env.CONTRACT_EXPIRE_DAYS),
};

export default config;
