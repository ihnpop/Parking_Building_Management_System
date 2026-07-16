import axios from "axios";

import supabase from "../config/supabaseClient";

const API = axios.create({
  // baseURL: "http://localhost:3636/api"     //sửa chỗ này
  baseURL: import.meta.env.VITE_API_URL
});

// Tự động lấy token Supabase mới nhất trước mỗi request
// Tránh 401 do dùng token hết hạn từ localStorage
API.interceptors.request.use(async (config) => {
  try {
    // getSession() sẽ tự refresh token nếu đã hết hạn
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch (err) {
    // Nếu không lấy được session, request sẽ tiến hành không có token
    console.warn('[parkingApi] Could not get Supabase session:', err.message);
  }
  return config;
});

// Giữ lại getAuthHeaders cho các nơi có thể còn dùng (fallback)
const getAuthHeaders = () => {
  const token = localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Check-in phương tiện vào bãi xe.
 *
 * @param {string} plateNumber    - biển số xe
 * @param {File}   vehicleImage   - file ảnh toàn bộ xe
 * @param {File}   plateImage     - file ảnh biển số
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const checkInParking = async (plateNumber, vehicleImage, plateImage) => {
  const formData = new FormData();
  formData.append("plate_number", plateNumber);
  formData.append("vehicleImage", vehicleImage);
  formData.append("plateImage", plateImage);

  const response = await API.post("/parking/check-in", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  // Trả về { success, message } từ backend
  return response.data;
};

/**
 * Check-out phương tiện ra khỏi bãi xe.
 *
 * @param {string} plateNumber    - biển số xe
 * @param {File}   vehicleImage   - file ảnh toàn bộ xe lúc ra
 * @param {File}   plateImage     - file ảnh biển số lúc ra
 * @returns {Promise<{ success: boolean, message: string, session: object, fee: number }>}
 */
export const checkOutParking = async (plateNumber, vehicleImage, plateImage) => {
  const formData = new FormData();
  formData.append("plate_number", plateNumber);
  formData.append("vehicleImage", vehicleImage);
  formData.append("plateImage", plateImage);

  const response = await API.post("/parking/check-out", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
};

/**
 * Tải ảnh camera lên cho Gate Simulator.
 * @param {File} file 
 * @param {string} folder - 'entry/vehicle', 'entry/plate', 'exit/vehicle', 'exit/plate'
 * @returns {Promise<{ success: boolean, publicUrl: string }>}
 */
export const uploadGateFile = async (file, folder) => {
  const formData = new FormData();
  formData.append("file", file);
  if (folder) {
    formData.append("folder", folder);
  }

  const response = await API.post("/gate/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

/**
 * Gọi API giả lập OCR nhận diện biển số xe từ file ảnh.
 * @param {File} file 
 * @returns {Promise<{ success: boolean, plateNumber: string }>}
 */
export const simulateOcrFile = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await API.post("/gate/ocr", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};



/**
 * Kiểm tra xe vào (Entry Pre-check)
 * @param {string} plateNumber 
 */
export const preCheckEntryGate = async (plateNumber) => {
  const response = await API.post("/gate/entry/pre-check", { plateNumber });
  return response.data;
};

/**
 * Xác nhận xe vào bãi (Check-In)
 * @param {object} payload - { cardCode, plateNumber, entryVehicleImage, entryPlateImage }
 */
export const entryGate = async (payload) => {
  const response = await API.post("/gate/entry", payload, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

/**
 * Kiểm tra xe ra (Exit Pre-check)
 * @param {string} plateNumber 
 */
export const preCheckExitGate = async (plateNumber) => {
  const response = await API.post("/gate/exit/pre-check", { plateNumber });
  return response.data;
};

/**
 * Xác nhận xe ra bãi (Check-Out)
 * @param {object} payload - { cardCode, plateNumber, exitVehicleImage, exitPlateImage }
 */
export const exitGate = async (payload) => {
  const response = await API.post("/gate/exit", payload, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

/**
 * Lấy thống kê bãi xe thực tế
 * @param {string|null} dateStr - Ngày dạng 'YYYY-MM-DD'. Nếu null thì lấy hôm nay.
 */
export const getParkingStats = async (dateStr = null) => {
  const params = dateStr ? { date: dateStr } : {};
  const response = await API.get("/gate/stats", { params });
  return response.data;
};

/**
 * Lấy danh sách tất cả phiên gửi xe
 * @param {string|null} dateStr - Ngày dạng 'YYYY-MM-DD'. Nếu null thì lấy hôm nay.
 */
export const getParkingSessions = async (dateStr = null) => {
  const params = dateStr ? { date: dateStr } : {};
  const response = await API.get("/gate/sessions", { params });
  return response.data;
};

