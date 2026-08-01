// Import axios để gọi HTTP API
import axios from "axios";
// Import client Supabase để lấy token mới nhất trước mỗi request
import supabase from "../config/supabaseClient";

// Tạo instance Axios riêng cho contractApi, tất cả endpoint nằm dưới /api/contracts/
const API = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/contracts`
});

// Tự động lấy token Supabase mới nhất trước mỗi request
API.interceptors.request.use(async (config) => {
  try {
    // Lấy session Supabase hiện tại
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      // Đính token vào header Authorization
      config.headers.Authorization = `Bearer ${session.access_token}`;
    } else {
      // Fallback: lấy token từ localStorage
      const token = localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch (err) {
    console.warn('[contractApi] Could not get session token:', err.message);
  }
  return config;
});


// Helper để lấy token xác thực (đã được interceptor tự động xử lý — giữ để tương thích)
const getAuthHeaders = () => ({});

/**
 * Gửi email yêu cầu ký hợp đồng cho khách hàng
 * Server sẽ tạo link ký hợp đồng riêng và gửi vào email của khách hàng
 * @param {string} registrationId - ID đăng ký thẻ tháng
 * @returns {Promise<object>} - { status: 'Đã gửi', ... }
 */
export const sendContractEmail = async (registrationId) => {
  const response = await API.post("/send", { registrationId }, {
    headers: getAuthHeaders()
  });
  return response.data;
};

/**
 * Lấy chi tiết hợp đồng qua token ký (Công khai — không cần đăng nhập hệ thống)
 * Dùng trong trang /sign-contract/:token mà khách hàng nhận được qua email
 * @param {string} token - Token ký hợp đồng trong URL
 * @returns {Promise<object>} - Thông tin hợp đồng và khách hàng
 */
export const getContractByToken = async (token) => {
  const response = await API.get(`/sign/${token}`);
  return response.data;
};

/**
 * Đồng ý ký hợp đồng (Công khai — không cần đăng nhập hệ thống)
 * Khách hàng click "Ký hợp đồng" trên trang /sign-contract/:token
 * @param {string} token - Token ký hợp đồng
 * @returns {Promise<object>} - { status: 'Đã ký', signed_at: ... }
 */
export const signContract = async (token) => {
  const response = await API.post(`/sign/${token}`);
  return response.data;
};

/**
 * Lấy trạng thái hợp đồng hiện tại của một đăng ký thẻ
 * (Dùng trong ContractModal để hiển thị badge trạng thái: 'Chưa gửi', 'Đã gửi', 'Đã ký')
 * @param {string} registrationId - ID đăng ký thẻ tháng
 * @returns {Promise<object>} - { status: 'Chưa gửi'|'Đã gửi'|'Đã ký' }
 */
export const getContractStatus = async (registrationId) => {
  const response = await API.get(`/status/${registrationId}`, {
    headers: getAuthHeaders()
  });
  return response.data;
};
