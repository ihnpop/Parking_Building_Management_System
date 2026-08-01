import API from "./apiClient";

/**
 * Tải ảnh camera lên cho Gate Simulator.
 * @param {File} file - File ảnh cần upload
 * @param {string} folder - Thư mục lưu
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
 * @param {object} payload
 */
export const entryGate = async (payload) => {
  const response = await API.post("/gate/entry", payload);
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
 * @param {object} payload
 */
export const exitGate = async (payload) => {
  const response = await API.post("/gate/exit", payload);
  return response.data;
};

/**
 * Lấy thống kê bãi xe thực tế
 * @param {string|null} dateStr
 * @param {string|null} buildingId
 */
export const getParkingStats = async (dateStr = null, buildingId = null) => {
  const params = {};
  if (dateStr) params.date = dateStr;
  if (buildingId) params.building_id = buildingId;
  const response = await API.get("/gate/stats", { params });
  return response.data;
};

/**
 * Lấy danh sách tất cả phiên gửi xe
 * @param {string|null} dateStr
 * @param {string|null} buildingId
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
 * @param {object} payload - { sessionId }
 */
export const openGateFree = async (payload) => {
  const response = await API.post("/parking/open-gate-free", payload);
  return response.data;
};
