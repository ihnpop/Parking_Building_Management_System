import registrationService from '../service/parkingRegistrationService.js';

class ParkingRegistrationController {
    async registerMonthlyTicket(req, res) {
        try {
            const result = await registrationService.processFullMonthlyRegistration(req.body);
            return res.status(200).json({
                success: true,
                message: "Quy trình đăng ký xe tháng hoàn tất thành công!",
                data: result
            });
        } catch (error) {
            console.error("Lỗi đăng ký vé tháng:", error);
            return res.status(500).json({
                success: false,
                message: error.message || "Luồng đăng ký vé tháng gặp sự cố."
            });
        }
    }
}

export default new ParkingRegistrationController();