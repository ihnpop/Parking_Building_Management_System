const axios = require('axios');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Đọc chứng chỉ Public Key CA để chống tấn công giả mạo (Man-in-the-middle)
let httpsAgent;
try {
    const caCert = fs.readFileSync(path.join(__dirname, '../config/vnpt_ca.crt'));
    httpsAgent = new https.Agent({ ca: caCert });
} catch (error) {
    console.warn("Chưa cấu hình Public Key CA hoặc file crt bị lỗi. Sử dụng Agent mặc định.");
    httpsAgent = new https.Agent({ rejectUnauthorized: false });
}

class EkycService {
    /**
     * Bóc tách thông tin CCCD từ hình ảnh dạng Base64
     */
    async extractIdentity(frontImageBase64, backImageBase64) {
        try {
            const response = await axios.post(
                process.env.VNPT_EKYC_OCR_URL,
                {
                    img_front: frontImageBase64,
                    img_back: backImageBase64
                },
                {
                    httpsAgent: httpsAgent,
                    headers: {
                        'Content-Type': 'application/json',
                        'Token-id': process.env.VNPT_TOKEN_ID,
                        'Token-key': process.env.VNPT_TOKEN_KEY,
                        'Authorization': `Bearer ${process.env.VNPT_ACCESS_TOKEN}`
                    }
                }
            );

            // Giả định mã status thành công từ VNPT là 0 (hoặc thay đổi theo tài liệu thật của bạn)
            if (response.data && response.data.status === 0) {
                return {
                    success: true,
                    data: response.data.object // Chứa thông tin: name, id, birth_day, address...
                };
            } else {
                throw new Error(response.data.message || 'Hệ thống VNPT eKYC từ chối nhận diện giấy tờ.');
            }
        } catch (error) {
            console.error('Lỗi kết nối VNPT eKYC:', error.response?.data || error.message);
            throw new Error(error.message || 'Lỗi kết nối hệ thống định danh.');
        }
    }
}

module.exports = new EkycService();