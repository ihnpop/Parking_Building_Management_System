import supabase from "../config/supabaseClient.js";
import supabaseAdmin from "../config/supabaseAdmin.js";
import axios from "axios";
import { UAParser } from "ua-parser-js";

/**
 * Parse User-Agent string thành tên browser + OS dễ đọc.
 * Sử dụng thư viện ua-parser-js (đã có trong dependencies) thay vì regex thủ công.
 *
 * @param {string} uaString
 * @returns {string}
 */
export const parseUserAgent = (uaString) => {
  if (!uaString) return "Unknown Device";
  const parser = new UAParser(uaString);
  const browser = parser.getBrowser().name || "Unknown Browser";
  const os = parser.getOS().name || "Unknown OS";
  return `${browser} - ${os}`;
};

/**
 * Tra cứu vị trí địa lý từ IP address.
 * Bỏ qua IP nội bộ (trả về null thay vì hardcode "Hà Nội").
 *
 * @param {string} ip
 * @returns {Promise<string|null>}
 */
export const getIPLocation = async (ip) => {
  if (
    !ip ||
    ip === "::1" ||
    ip === "127.0.0.1" ||
    ip === "::ffff:127.0.0.1" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.")
  ) {
    return null; // IP nội bộ → không xác định được vị trí
  }

  try {
    const res = await axios.get(`https://ip-api.com/json/${ip}`, {
      timeout: 3000, // Tránh treo request nếu API chậm
    });
    if (res.data?.status === "success") {
      return `${res.data.city}, ${res.data.country}`;
    }
  } catch (err) {
    console.error("[LoginService] IP location lookup failed:", err.message);
  }

  return null;
};

/**
 * Đếm số lần đăng nhập thất bại liên tiếp gần nhất của một email.
 *
 * @param {string} email
 * @returns {Promise<number>}
 */
export const getConsecutiveFailures = async (email) => {
  const { data: logs, error } = await supabaseAdmin
    .from("login_logs")
    .select("status")
    .eq("username", email)
    .order("login_time", { ascending: false })
    .limit(5);

  if (error || !logs) return 0;

  let count = 0;
  for (const log of logs) {
    if (log.status === "Thành công") break;
    if (log.status === "Thất bại" || log.status === "Tài khoản bị khóa") {
      count++;
    }
  }
  return count;
};

/**
 * Xử lý đăng nhập: xác thực + ghi log.
 *
 * @param {object} params
 * @param {string} params.email
 * @param {string} params.password
 * @param {string} params.ip
 * @param {string} params.userAgent
 * @returns {Promise<object>} - Supabase auth session data
 */
export const login = async ({ email, password, ip, userAgent }) => {
  // 1. Kiểm tra profile tồn tại (không log nếu email không có trong hệ thống)
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (profileErr || !profile) {
    // Không ghi log → tránh leak thông tin user nào tồn tại
    const err = new Error("Tài khoản hoặc mật khẩu không chính xác");
    err.statusCode = 401;
    throw err;
  }

  const profilesId = profile.id;
  const deviceBrowser = parseUserAgent(userAgent);
  const location = await getIPLocation(ip);

  // 2. Xác thực với Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Xác định loại trạng thái log
    const consecutiveFailures = await getConsecutiveFailures(email);
    const status = consecutiveFailures + 1 > 3 ? "Tài khoản bị khóa" : "Thất bại";

    // Ghi log đăng nhập thất bại
    try {
      await supabaseAdmin.from("login_logs").insert({
        profiles_id: profilesId,
        username: email,
        status,
        login_time: new Date().toISOString(),
      });
    } catch (logErr) {
      console.error("[LoginService] Error inserting failed login log:", logErr.message);
    }

    const err = new Error(error.message);
    err.statusCode = 401;
    throw err;
  }

  // 3. Đăng nhập thành công → ghi log
  try {
    await supabaseAdmin.from("login_logs").insert({
      profiles_id: profilesId,
      username: email,
      status: "Thành công",
      login_time: new Date().toISOString(),
    });
  } catch (logErr) {
    console.error("[LoginService] Error inserting success login log:", logErr.message);
  }

  return data;
};
