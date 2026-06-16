import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:3636/api",
});

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
