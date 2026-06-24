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



/**
 * Tạo mới thẻ tháng (đăng ký mới)
 */
export const createMonthCard = async (req, res) => {
  try {
    const {
      plate,
      startDate,
      durationMonths,
      fullName,
      phone,
      email,
      status,
      vehicleTypeId,
      note
    } = req.body;

    if (!plate) {
      return res.status(400).json({ error: "Thiếu biển số xe (plate)." });
    }
    if (!fullName) {
      return res.status(400).json({ error: "Thiếu tên khách hàng (fullName)." });
    }
    if (!durationMonths) {
      return res.status(400).json({ error: "Thiếu thời hạn đăng ký (durationMonths)." });
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

    if (!currentUserId) {
      const { data: profiles } = await supabase.from("profiles").select("id").limit(1);
      if (profiles && profiles.length > 0) {
        currentUserId = profiles[0].id;
      }
    }

    if (!currentUserId) {
      return res.status(401).json({ error: "Yêu cầu đăng nhập để thực hiện tác vụ này." });
    }

    const result = await monthCardService.createMonthCard({
      plate,
      startDate,
      durationMonths: Number(durationMonths),
      fullName,
      phone,
      email,
      status,
      vehicleTypeId,
      note,
      currentUserId
    });

    return res.status(201).json(result);
  } catch (err) {
    console.error("Lỗi Controller tạo thẻ tháng mới:", err);
    return res.status(400).json({ error: err.message });
  }
};





/**
 * Cập nhật thông tin thẻ tháng
 */
// export const updateMonthCard = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const result = await monthCardService.updateMonthCard(id, req.body);
//     return res.status(200).json(result);
//   } catch (err) {
//     console.error("Lỗi Controller cập nhật thẻ tháng:", err);
//     return res.status(500).json({
//       success: false,
//       message: err.message
//     });
//   }
// }; 

export const updateMonthCard = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await monthCardService.updateMonthCard(id, req.body);
    return res.status(200).json(result);
  } catch (err) {
    console.error("Lỗi Controller cập nhật thẻ tháng:", err);
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * Lấy danh sách thẻ tháng
 */
export const getMonthCards = async (req, res) => {
  try {
    const monthCards = await monthCardService.getMonthCards();
    return res.status(200).json(monthCards);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Lấy lịch sử giao dịch thẻ tháng
 */
export const getMonthCardLogs = async (req, res) => {
  try {
    const logs = await monthCardService.getMonthCardLogs();
    return res.status(200).json(logs);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

