const registrationService = require('../service/parkingRegistrationService');

class ParkingRegistrationController {
    async registerMonthlyTicket(req, res) {
        try {
            const result = await registrationService.processFullMonthlyRegistration(req.body);
            return res.status(200).json({
                success: true,
                message: "Quy trình đăng ký xe tháng khép kín hoàn tất thành công!",
                data: result
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message || "Luồng đăng ký xe gặp sự cố hệ thống."
            });
        }
    }
}

module.exports = new ParkingRegistrationController();