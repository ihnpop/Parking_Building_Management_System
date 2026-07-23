import axios from "axios";
import supabase from "../config/supabaseClient";

const API = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/contracts`
});

// Tự động lấy token Supabase mới nhất trước mỗi request
API.interceptors.request.use(async (config) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    } else {
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


// Helper để lấy token xác thực (đã được interceptor tự động xử lý)
const getAuthHeaders = () => ({});

/**
 * Gửi email yêu cầu ký hợp đồng cho khách hàng
 * @param {string} registrationId 
 * @returns {Promise<object>}
 */
export const sendContractEmail = async (registrationId) => {
  const response = await API.post("/send", { registrationId }, {
    headers: getAuthHeaders()
  });
  return response.data;
};

/**
 * Lấy chi tiết hợp đồng qua token ký (Công khai)
 * @param {string} token 
 * @returns {Promise<object>}
 */
export const getContractByToken = async (token) => {
  const response = await API.get(`/sign/${token}`);
  return response.data;
};

/**
 * Đồng ý ký hợp đồng (Công khai)
 * @param {string} token 
 * @returns {Promise<object>}
 */
export const signContract = async (token) => {
  const response = await API.post(`/sign/${token}`);
  return response.data;
};

/**
 * Lấy trạng thái hợp đồng hiện tại
 * @param {string} registrationId 
 * @returns {Promise<object>}
 */
export const getContractStatus = async (registrationId) => {
  const response = await API.get(`/status/${registrationId}`, {
    headers: getAuthHeaders()
  });
  return response.data;
};
