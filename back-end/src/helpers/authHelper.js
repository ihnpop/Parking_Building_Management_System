import supabase from "../config/supabaseClient.js";

/**
 * Lấy userId từ Bearer token trong request header.
 * Nếu không có hoặc token không hợp lệ, fallback lấy id của profile đầu tiên trong DB.
 * @param {import('express').Request} req
 * @returns {Promise<string|null>} userId hoặc null
 */
export async function getUserIdFromReq(req) {
  let userId = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
      }
    } catch (authErr) {
      console.error("Lỗi giải mã Supabase token:", authErr);
    }
  }

  // Fallback: lấy profile đầu tiên (dùng khi dev/postman không gửi token)
  if (!userId) {
    const { data: profiles } = await supabase.from("profiles").select("id").limit(1);
    userId = profiles?.[0]?.id || null;
  }

  return userId;
}
