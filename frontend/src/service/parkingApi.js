// Import axios: thư viện HTTP client để gọi REST API từ frontend
import axios from "axios";

// Import client Supabase để lấy session token mới nhất trước mỗi request
import supabase from "../config/supabaseClient";

// Tạo instance Axios riêng cho parkingApi với baseURL từ biến môi trường
const API = axios.create({
  // baseURL: "http://localhost:3636/api"     // (đã comment) — URL cứng dùng khi dev local
  baseURL: import.meta.env.VITE_API_URL // URL backend từ biến môi trường Vite
});

// Tự động lấy token Supabase mới nhất trước mỗi request
// Tránh 401 do dùng token hết hạn từ localStorage
API.interceptors.request.use(async (config) => {
  try {
    // Thử lấy session hiện tại từ Supabase SDK
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      // Nếu có session hợp lệ: đính token vào header Authorization
      config.headers.Authorization = `Bearer ${session.access_token}`;
    } else {
      // Fallback: lấy token từ localStorage nếu Supabase không có session
      const token = localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch (err) {
    // Cảnh báo nếu không lấy được session (không throw để request vẫn tiếp tục)
    console.warn('[parkingApi] Could not get Supabase session:', err.message);
  }
  return config; // Trả về config đã thêm Authorization header
});

// Giữ lại getAuthHeaders cho các nơi có thể còn dùng (fallback — hiện tại interceptor đã xử lý tự động)
const getAuthHeaders = () => {
  const token = localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Tải ảnh camera lên cho Gate Simulator.
 * @param {File} file - File ảnh cần upload
 * @param {string} folder - Thư mục lưu: 'entry/vehicle', 'entry/plate', 'exit/vehicle', 'exit/plate'
 * @returns {Promise<{ success: boolean, publicUrl: string }>}
 */
export const uploadGateFile = async (file, folder) => {
  // Tạo FormData để gửi file qua multipart/form-data
  const formData = new FormData();
  formData.append("file", file); // Đính file ảnh vào form
  if (folder) {
    formData.append("folder", folder); // Đính tên thư mục đích vào form
  }

  // Gọi API upload ảnh lên server
  const response = await API.post("/gate/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" }, // Bắt buộc phải set header này khi gửi FormData
  });
  return response.data;
};

/**
 * Gọi API giả lập OCR nhận diện biển số xe từ file ảnh.
 * @param {File} file - File ảnh chứa biển số xe
 * @returns {Promise<{ success: boolean, plateNumber: string }>}
 */
export const simulateOcrFile = async (file) => {
  // Tạo FormData chứa file ảnh để gửi lên API OCR
  const formData = new FormData();
  formData.append("file", file);

  // Gọi API OCR trả về biển số xe đã nhận dạng
  const response = await API.post("/gate/ocr", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};



/**
 * Kiểm tra xe vào (Entry Pre-check)
 * Kiểm tra biển số có hợp lệ, có thẻ tháng đang hoạt động không trước khi thực sự cho xe vào
 * @param {string} plateNumber - Biển số xe cần kiểm tra
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
  const response = await API.post("/gate/entry", payload);
  return response.data;
};

/**
 * Kiểm tra xe ra (Exit Pre-check)
 * Tính phí ước tính, kiểm tra phiên hiện tại của xe trước khi cho ra
 * @param {string} plateNumber - Biển số xe cần kiểm tra
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
  const response = await API.post("/gate/exit", payload);
  return response.data;
};

/**
 * Lấy thống kê bãi xe thực tế (số chỗ trống, chỗ đã dùng, lưu lượng, doanh thu)
 * @param {string|null} dateStr - Ngày dạng 'YYYY-MM-DD'. Nếu null thì lấy hôm nay.
 * @param {string|null} buildingId - ID tòa nhà của nhân viên
 */
export const getParkingStats = async (dateStr = null, buildingId = null) => {
  const params = {};
  if (dateStr) params.date = dateStr;           // Thêm filter ngày nếu có
  if (buildingId) params.building_id = buildingId; // Thêm filter tòa nhà nếu có
  const response = await API.get("/gate/stats", { params });
  return response.data;
};

/**
 * Lấy danh sách tất cả phiên gửi xe
 * @param {string|null} dateStr - Ngày dạng 'YYYY-MM-DD'. Nếu null thì lấy hôm nay.
 * @param {string|null} buildingId - ID tòa nhà
 */
export const getParkingSessions = async (dateStr = null, buildingId = null) => {
  const params = {};
  if (dateStr) params.date = dateStr;
  if (buildingId) params.building_id = buildingId;
  const response = await API.get("/gate/sessions", { params });
  return response.data;
};

/**
 * Mở barie trực tiếp/miễn phí khi estimated_fee = 0
 * (Xe tháng ra với phí = 0, không cần đi qua thanh toán)
 * @param {object} payload - { sessionId }
 */
export const openGateFree = async (payload) => {
  const response = await API.post("/parking/open-gate-free", payload);
  return response.data;
};


