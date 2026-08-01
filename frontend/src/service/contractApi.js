import API from "./apiClient";

/**
 * Gửi email yêu cầu ký hợp đồng cho khách hàng
 * @param {string} registrationId - ID đăng ký thẻ tháng
 * @returns {Promise<object>}
 */
export const sendContractEmail = async (registrationId) => {
  const response = await API.post("/contracts/send", { registrationId });
  return response.data;
};

/**
 * Lấy chi tiết hợp đồng qua token ký (Công khai)
 * @param {string} token - Token ký hợp đồng trong URL
 * @returns {Promise<object>}
 */
export const getContractByToken = async (token) => {
  const response = await API.get(`/contracts/sign/${token}`);
  return response.data;
};

/**
 * Đồng ý ký hợp đồng (Công khai)
 * @param {string} token - Token ký hợp đồng
 * @returns {Promise<object>}
 */
export const signContract = async (token) => {
  const response = await API.post(`/contracts/sign/${token}`);
  return response.data;
};

/**
 * Lấy trạng thái hợp đồng hiện tại của một đăng ký thẻ
 * @param {string} registrationId - ID đăng ký thẻ tháng
 * @returns {Promise<object>}
 */
export const getContractStatus = async (registrationId) => {
  const response = await API.get(`/contracts/status/${registrationId}`);
  return response.data;
};
