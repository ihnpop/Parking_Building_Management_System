import supabase from "../config/supabaseClient.js";

/**
 * Giải mã payload JWT thủ công từ chuỗi token base64url.
 * Giúp đọc thông tin user_id ngay cả khi token đã hết hạn.
 */
function decodeJwtPayload(token) {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

/**
 * Lấy userId từ Bearer token trong request header.
 * Nếu không có hoặc token không hợp lệ, fallback lấy id của profile đầu tiên trong DB.
 * @param {import('express').Request} req
 * @returns {Promise<string|null>} userId hoặc null
 */
export async function getUserIdFromReq(req) {
  let userId = null;

  // 1. Check if user is already attached to request (by middleware)
  if (req.user?.id) {
    userId = req.user.id;
  }

  // 2. Parse from authorization header
  if (!userId) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      if (token && token !== "null" && token !== "undefined") {
        try {
          const { data: { user }, error: authError } = await supabase.auth.getUser(token);
          if (!authError && user) {
            userId = user.id;
          } else {
            // Fallback 1: Giải mã trực tiếp payload của JWT token
            const decoded = decodeJwtPayload(token);
            if (decoded && (decoded.sub || decoded.id)) {
              userId = decoded.sub || decoded.id;
              console.log("[AuthHelper] Giải mã token hết hạn thành công. UserId:", userId);
            }
          }
        } catch (authErr) {
          console.error("Lỗi giải mã Supabase token:", authErr);
          // Fallback 1 (trong case ném exception)
          const decoded = decodeJwtPayload(token);
          if (decoded && (decoded.sub || decoded.id)) {
            userId = decoded.sub || decoded.id;
          }
        }
      }
    }
  }

  // Fallback 2: lấy profile đầu tiên (dùng khi dev/postman không gửi token)
  if (!userId) {
    const { data: profiles } = await supabase.from("profiles").select("id").limit(1);
    userId = profiles?.[0]?.id || null;
  }

  return userId;
}

