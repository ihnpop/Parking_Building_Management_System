import axios from "axios";
import FormData from "form-data";

/**
 * Gửi file ảnh biển số xe lên FastAPI server để nhận dạng bằng PaddleOCR.
 * @param {object} file - Đối tượng file từ Multer memoryStorage (chứa buffer)
 * @returns {Promise<{ success: boolean, plate: string, raw_plate?: string }>}
 */
export const readPlate = async (file) => {
  if (!file || !file.buffer) {
    throw new Error("Không có dữ liệu file ảnh để quét OCR.");
  }

  const form = new FormData();
  // Append file buffer và đính kèm originalname để server Python nhận dạng đúng tên file
  form.append("file", file.buffer, {
    filename: file.originalname || "plate.jpg",
    contentType: file.mimetype || "image/jpeg"
  });

  const ocrUrl = process.env.OCR_SERVICE_URL || "http://localhost:8000";

  const response = await axios.post(
    `${ocrUrl}/ocr`,
    form,
    {
      headers: {
        ...form.getHeaders()
      }
    }
  );

  return response.data;
};