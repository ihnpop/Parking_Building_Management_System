const ekycService = require('../service/ekycService');

class EkycController {
    async verifyCard(req, res) {
        try {
            const { img_front_base64, img_back_base64 } = req.body;

            if (!img_front_base64 || !img_back_base64) {
                return res.status(400).json({ success: false, message: 'Thiếu ảnh mặt trước hoặc mặt sau CCCD.' });
            }

            // Gọi dịch vụ eKYC xử lý
            const result = await ekycService.extractIdentity(img_front_base64, img_back_base64);

            return res.status(200).json(result);
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new EkycController();