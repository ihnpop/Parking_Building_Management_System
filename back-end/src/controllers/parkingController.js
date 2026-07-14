import * as parkingService from "../service/parkingService.js";

/**
 * POST /api/parking/check-in
 *
 * Body (multipart/form-data):
 *   - plate_number  {string}  - biển số xe
 *   - vehicleImage  {File}    - ảnh toàn bộ xe
 *   - plateImage    {File}    - ảnh biển số
 */
export const checkIn = async (req, res) => {
  try {
    const plateNumber = req.body.plate_number;
    const vehicleImageFile = req.files?.vehicleImage?.[0];
    const plateImageFile = req.files?.plateImage?.[0];

    const result = await parkingService.checkIn(plateNumber, vehicleImageFile, plateImageFile);

    return res.status(201).json({
      success: true,
      message: result.message,
      session: result.session,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message || "Internal server error",
    });
  }
};

/**
 * POST /api/parking/check-out
 *
 * Body (multipart/form-data):
 *   - plate_number  {string}  - biển số xe
 *   - vehicleImage  {File}    - ảnh toàn bộ xe lúc ra
 *   - plateImage    {File}    - ảnh biển số lúc ra
 */
export const checkOut = async (req, res) => {
  try {
    const plateNumber = req.body.plate_number;
    const vehicleImageFile = req.files?.vehicleImage?.[0];
    const plateImageFile = req.files?.plateImage?.[0];

    const result = await parkingService.checkOut(plateNumber, vehicleImageFile, plateImageFile);

    return res.status(200).json({
      success: true,
      message: result.message,
      session: result.session,
      fee: result.fee,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message || "Internal server error",
    });
  }
};

/**
 * POST /api/parking/open-gate-free
 * Body: { sessionId }
 */
export const openGateFree = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const staffId = req.user?.id;

    const result = await parkingService.openGateFree({ sessionId, staffId });
    return res.status(200).json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message || "Lỗi xử lý mở cổng miễn phí."
    });
  }
};
