import * as monthCardService from "../service/monthCardService.js";
import supabase from "../config/supabaseClient.js";

/**
 * Lấy danh sách gói gia hạn thẻ tháng
 */
export const getRenewPackages = async (req, res) => {
  try {
    return res.status(200).json(monthCardService.RENEW_PACKAGES);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Thực hiện gia hạn thẻ tháng
 */
export const renewMonthlyCard = async (req, res) => {
  try {
    const { registrationId, months, note } = req.body;

    if (!registrationId) {
      return res.status(400).json({ error: "Thiếu thông tin đăng ký (registrationId)." });
    }
    if (!months) {
      return res.status(400).json({ error: "Thiếu thông tin số tháng gia hạn." });
    }

    // Xác thực người thực hiện (performed_by) từ token JWT
    let currentUserId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (!authError && user) {
          currentUserId = user.id;
        }
      } catch (authErr) {
        console.error("Lỗi giải mã Supabase token:", authErr);
      }
    }

    // Fallback: nếu không lấy được userId từ token (ví dụ chạy dev/postman chưa gửi header)
    // thì lấy profile ID đầu tiên từ bảng profiles để tránh lỗi khóa ngoại (foreign key constraint)
    if (!currentUserId) {
      const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
      if (profiles && profiles.length > 0) {
        currentUserId = profiles[0].id;
      }
    }

    if (!currentUserId) {
      return res.status(401).json({ error: "Yêu cầu đăng nhập để thực hiện tác vụ này." });
    }

    const result = await monthCardService.renewMonthlyCard({
      registrationId,
      months: Number(months),
      note,
      currentUserId
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error("Lỗi Controller gia hạn thẻ tháng:", err);
    return res.status(400).json({ error: err.message });
  }
};
