import axios from 'axios';
import FormData from 'form-data';
import https from 'https';
import { config } from '../config/config.js';

// ─── Cấu hình VNPT eKYC ──────────────────────────────────────────────────────
const getVnptDomain = () => {
  const domain = config.vnptDomain || process.env.VNPT_DOMAIN || 'https://api.idg.vnpt.vn';
  return domain.trim().replace(/\/+$/, '');
};

// VNPT_ACCESS_TOKEN trong .env có thể chứa prefix "bearer " (lowercase)
// → cần normalize về "Bearer xxx"
const getAccessToken = () => {
  const raw = process.env.VNPT_ACCESS_TOKEN || '';
  return raw.replace(/^bearer\s+/i, '');
};

const getJsonHeaders = () => ({
  'Content-Type': 'application/json',
  'mac-address': 'TEST1',
  'Token-id': process.env.VNPT_TOKEN_ID,
  'Token-key': process.env.VNPT_TOKEN_KEY,
  'Authorization': `Bearer ${getAccessToken()}`
});

// Bỏ qua SSL cert check (dùng cho dev/test, nếu VNPT cần cert riêng thì config lại)
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// Client session giả lập cho môi trường web backend
const makeClientSession = () =>
  `WEB_nodejs_web_Device_1.0.0_parking-backend_${Date.now()}`;

// ─── 1. Upload ảnh lên VNPT File Service → lấy hash ─────────────────────────
/**
 * @param {string} base64String  - ảnh dạng Base64 thuần (không có prefix data:image/...)
 * @param {string} title         - tiêu đề file (dùng để dễ phân biệt log)
 * @returns {Promise<string>}    - hash string từ VNPT
 */
export const uploadImageToVNPT = async (base64String, title = 'cccd_image') => {
  try {
    const buffer = Buffer.from(base64String, 'base64');
    const form = new FormData();
    form.append('file', buffer, {
      filename: `${title}.jpg`,
      contentType: 'image/jpeg'
    });
    form.append('title', title);
    form.append('description', `eKYC - ${title}`);

    const response = await axios.post(
      `${getVnptDomain()}/file-service/v1/addFile`,
      form,
      {
        httpsAgent,
        headers: {
          ...form.getHeaders(),
          'mac-address': 'TEST1',
          'Token-id': process.env.VNPT_TOKEN_ID,
          'Token-key': process.env.VNPT_TOKEN_KEY,
          'Authorization': `Bearer ${getAccessToken()}`
        },
        timeout: 15000
      }
    );

    if (response.data?.object?.hash) {
      return response.data.object.hash;
    }

    throw new Error(response.data?.message || JSON.stringify(response.data));
  } catch (err) {
    console.error(`Lỗi upload ảnh lên VNPT (${title}):`, err.response?.data || err.message);
    const vnptData = err.response?.data;
    const errorMsg = vnptData?.message || vnptData?.errors?.[0] || err.message || 'Lỗi upload ảnh lên máy chủ VNPT';
    throw new Error(`VNPT upload thất bại (${title}): ${errorMsg}`);
  }
};

// ─── 2. Kiểm tra giấy tờ thật/giả (Card Liveness) ──────────────────────────
/**
 * @param {string} imageHash  - hash lấy từ uploadImageToVNPT
 * @returns {Promise<{liveness: string, liveness_msg: string, face_swapping: boolean, fake_liveness: boolean}>}
 */
export const checkDocumentLiveness = async (imageHash) => {
  try {
    const response = await axios.post(
      `${getVnptDomain()}/ai/v1/card/liveness`,
      {
        img: imageHash,
        client_session: makeClientSession()
      },
      {
        httpsAgent,
        headers: getJsonHeaders(),
        timeout: 15000
      }
    );

    if (response.data?.message === 'IDG-00000000' && response.data?.object) {
      return {
        success: true,
        isReal: response.data.object.liveness === 'success',
        liveness: response.data.object.liveness,
        liveness_msg: response.data.object.liveness_msg,
        face_swapping: response.data.object.face_swapping,
        fake_liveness: response.data.object.fake_liveness
      };
    }

    // VNPT trả lỗi trong data nhưng HTTP status là 2xx
    const msg = response.data?.message || response.data?.errors?.[0] || 'Kiểm tra liveness thất bại';
    return {
      success: false,
      isReal: false,
      liveness: 'failure',
      liveness_msg: msg
    };
  } catch (err) {
    // Bắt lỗi HTTP status code ngoài 2xx từ Axios (ví dụ 400 Bad Request của VNPT)
    console.error("Lỗi gọi VNPT Card Liveness API:", err.response?.data || err.message);
    const vnptData = err.response?.data;
    const errorMsg = vnptData?.errors?.[0] || vnptData?.message || err.message || 'Lỗi kết nối máy chủ VNPT';
    return {
      success: false,
      isReal: false,
      liveness: 'failure',
      liveness_msg: errorMsg
    };
  }
};

// ─── 3. OCR bóc tách thông tin CCCD (cả mặt trước và mặt sau) ───────────────
/**
 * @param {string} frontHash  - hash mặt trước từ VNPT
 * @param {string} backHash   - hash mặt sau từ VNPT
 * @returns {Promise<object>} - object chứa name, id, birth_day, ...
 */
export const ocrIdentityCard = async (frontHash, backHash) => {
  try {
    const response = await axios.post(
      `${getVnptDomain()}/ai/v1/ocr/id`,
      {
        img_front: frontHash,
        img_back: backHash,
        client_session: makeClientSession(),
        type: -1,
        validate_postcode: false,
        token: 'parking-system'
      },
      {
        httpsAgent,
        headers: getJsonHeaders(),
        timeout: 20000
      }
    );

    if (response.data?.message === 'IDG-00000000' && response.data?.object) {
      return { success: true, data: response.data.object };
    }

    throw new Error(
      response.data?.message || response.data?.errors?.[0] || 'Unknown'
    );
  } catch (err) {
    console.error("Lỗi gọi VNPT OCR API:", err.response?.data || err.message);
    const vnptData = err.response?.data;
    const errorMsg = vnptData?.message || vnptData?.errors?.[0] || err.message || 'Lỗi bóc tách thông tin CCCD';
    throw new Error(`VNPT OCR thất bại: ${errorMsg}`);
  }
};

// ─── 4. Luồng xác thực đầy đủ (upload → liveness → OCR) ────────────────────
/**
 * Luồng khép kín: upload ảnh → kiểm tra thật/giả → bóc tách thông tin
 * @param {string} frontBase64
 * @param {string} backBase64
 * @returns {Promise<{success, livenessResult, ocrData}>}
 */
export const extractIdentity = async (frontBase64, backBase64) => {
  // Bước 1: Upload song song cả 2 mặt
  const [frontHash, backHash] = await Promise.all([
    uploadImageToVNPT(frontBase64, 'cccd_front'),
    uploadImageToVNPT(backBase64, 'cccd_back')
  ]);

  // Bước 2: Kiểm tra thật/giả mặt trước
  const livenessResult = await checkDocumentLiveness(frontHash);
  if (!livenessResult.isReal) {
    return {
      success: false,
      livenessResult,
      ocrData: null,
      message: `Giấy tờ không hợp lệ: ${livenessResult.liveness_msg}`
    };
  }

  // Bước 3: OCR bóc tách thông tin
  const ocrResult = await ocrIdentityCard(frontHash, backHash);

  return {
    success: true,
    livenessResult,
    ocrData: ocrResult.data,
    message: 'Xác thực thành công'
  };
};