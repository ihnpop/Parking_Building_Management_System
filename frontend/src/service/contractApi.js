import axios from "axios";

const API = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/contracts`
});

// Helper để lấy token xác thực từ localStorage
const getAuthHeaders = () => {
  const token = localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

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
