import AppError from "../utils/AppError.js";
import * as parkingRepository from "../repositories/parkingRepository.js";
import { uploadToStorage } from "../helpers/storageHelper.js";
import { calculateExitFee, calculateFeeFromPriceItems } from "./feeCalculationService.js";

// ─── Check-in service ─────────────────────────────────────────────────────────

/**
 * Xử lý check-in: validate → upload ảnh → tạo session.
 *
 * @param {string}  plateNumber       - biển số xe
 * @param {Express.Multer.File} vehicleImageFile - file ảnh xe (multer)
 * @param {Express.Multer.File} plateImageFile   - file ảnh biển số (multer)
 * @returns {Promise<{ success: boolean, message: string, session?: object }>}
 */
export const checkIn = async (plateNumber, vehicleImageFile, plateImageFile) => {
  // 1. Validate đầu vào
  if (!plateNumber || !plateNumber.trim()) {
    throw new AppError("plate_number is required", 400);
  }
  if (!vehicleImageFile) {
    throw new AppError("vehicleImage is required", 400);
  }
  if (!plateImageFile) {
    throw new AppError("plateImage is required", 400);
  }

  // 2. Upload ảnh lên Supabase Storage
  const [entryVehicleUrl, entryPlateUrl] = await Promise.all([
    uploadToStorage(vehicleImageFile.buffer, "entry/vehicle", vehicleImageFile.originalname),
    uploadToStorage(plateImageFile.buffer, "entry/plate", plateImageFile.originalname),
  ]);

  // 3. Tạo parking session
  const session = await parkingRepository.createParkingSession({
    vehicle_id: null,
    plate_number: plateNumber.trim().toUpperCase(),
    entry_plate_image: entryPlateUrl,
  });

  return { success: true, message: "Check in successfully", session };
};

// ─── Check-out service ────────────────────────────────────────────────────────

/**
 * Xử lý check-out: validate → tìm active session → upload ảnh OUT → tính tiền → cập nhật session.
 *
 * @param {string}  plateNumber       - biển số xe
 * @param {Express.Multer.File} vehicleImageFile - file ảnh xe ra (multer)
 * @param {Express.Multer.File} plateImageFile   - file ảnh biển số ra (multer)
 * @returns {Promise<{ success: boolean, message: string, session?: object, fee: number }>}
 */
export const checkOut = async (plateNumber, vehicleImageFile, plateImageFile) => {
  // 1. Validate đầu vào
  if (!plateNumber || !plateNumber.trim()) {
    throw new AppError("plate_number is required", 400);
  }
  if (!vehicleImageFile) {
    throw new AppError("vehicleImage is required", 400);
  }
  if (!plateImageFile) {
    throw new AppError("plateImage is required", 400);
  }

  const cleanPlate = plateNumber.trim().toUpperCase();

  // 2. Tìm active session của biển số này
  const activeSession = await parkingRepository.findActiveSessionByPlate(cleanPlate);
  if (!activeSession) {
    throw new AppError("No active parking session found for this vehicle", 404);
  }

  // 3. Upload ảnh ra lên Supabase Storage
  const [exitVehicleUrl, exitPlateUrl] = await Promise.all([
    uploadToStorage(vehicleImageFile.buffer, "exit/vehicle", vehicleImageFile.originalname),
    uploadToStorage(plateImageFile.buffer, "exit/plate", plateImageFile.originalname),
  ]);

  // 4. Tính tiền gửi xe
  let entryTimeStr = activeSession.entry_time;
  if (typeof entryTimeStr === "string" && !entryTimeStr.endsWith("Z") && !entryTimeStr.match(/[+-]\d{2}(:\d{2})?$/)) {
    entryTimeStr += "Z";
  }
  const entryTime = new Date(entryTimeStr);
  const exitTime = new Date();
  const diffMs = exitTime.getTime() - entryTime.getTime();
  const totalHours = diffMs / (1000 * 60 * 60);
  const billableHours = Math.max(1, Math.ceil(totalHours)); // ít nhất 1 giờ

  let fee = billableHours * 10000; // Giá mặc định 10k/giờ

  // Thử tra cứu bảng giá từ Database dựa trên biển số xe
  try {
    const vehicle = await parkingRepository.findVehicleByPlate(activeSession.plate_number);

    if (vehicle?.vehicle_type_id) {
      const priceItems = await parkingRepository.findPriceItemsByVehicleType(vehicle.vehicle_type_id);

      if (priceItems && priceItems.length > 0) {
        const calculated = calculateFeeFromPriceItems(totalHours, priceItems);
        fee = calculated.fee;
      }
    }
  } catch (dbErr) {
    console.error("Error fetching database pricing, falling back to default:", dbErr);
  }

  // 5. Cập nhật phiên gửi xe thành COMPLETED
  const updatedSession = await parkingRepository.updateParkingSession(activeSession.session_id, {
    exit_time: exitTime.toISOString(),
    exit_vehicle_image: exitVehicleUrl,
    exit_plate_image: exitPlateUrl,
    status: "Hoàn thành",
    final_fee: fee,
  });

  return {
    success: true,
    message: "Check out successfully",
    session: updatedSession,
    fee,
  };
};

// ─── openGateFree service ─────────────────────────────────────────────────────

/**
 * Mở barie trực tiếp/miễn phí khi estimated_fee = 0 (vé tháng còn hạn hoặc thời gian gửi quá ngắn)
 *
 * @param {string} sessionId
 * @param {string} staffId
 * @returns {Promise<{ success: boolean, message: string, session: object }>}
 */
export const openGateFree = async ({ sessionId, staffId, finalFee = 0, ticketType, vehicleTypeId }) => {
  if (!sessionId) {
    throw new AppError("Thiếu session_id", 400);
  }

  // 1. Lấy thông tin session
  const session = await parkingRepository.getSessionById(sessionId);

  if (session.status !== "Đang gửi xe") {
    throw Object.assign(
      new Error(`Phiên gửi xe có trạng thái '${session.status}', không thể mở cổng ra trực tiếp.`),
      { statusCode: 400 }
    );
  }

  // Lấy ticketType nếu không có từ frontend
  let resolvedTicketType = ticketType;
  if (!resolvedTicketType && session.card_id) {
     const activeReg = await parkingRepository.findActiveCardRegistration(session.card_id);
     if (activeReg) {
         // Nếu có đăng ký thẻ tháng thì là Thẻ tháng
         resolvedTicketType = "Thẻ tháng";
     } else {
         resolvedTicketType = "Thẻ lượt";
     }
  } else if (!resolvedTicketType) {
     resolvedTicketType = "Thẻ lượt";
  }

  // 2. Cập nhật parking_sessions thành Hoàn thành
  const exitTime = new Date().toISOString();
  
  const updatedSession = await parkingRepository.updateSessionById(sessionId, {
    exit_time: exitTime,
    final_fee: finalFee,
    status: "Hoàn thành",
    staff_out_id: staffId || null,
  });

  // 4. Giải phóng thẻ tháng / thẻ lượt tương ứng
  if (session.card_id) {
    const activeReg = await parkingRepository.findActiveCardRegistration(session.card_id);

    if (activeReg && resolvedTicketType === "Thẻ lượt") {
      await parkingRepository.deactivateCardRegistration(activeReg.registration_id);
      await parkingRepository.resetCardStatus(session.card_id);
    }
  }

  // 5. Ghi nhận log xe ra
  const entryLog = await parkingRepository.getEntryLog(sessionId);

  let exitGateId = null;
  if (entryLog?.parking_id) {
    exitGateId = await parkingRepository.findExitGate(entryLog.parking_id);
  }

  if (entryLog?.building_id && entryLog?.parking_id && exitGateId) {
    await parkingRepository.insertExitLog({
      session_id: sessionId,
      vehicle_id: session.vehicle_id,
      card_id: session.card_id || null,
      building_id: entryLog.building_id,
      parking_id: entryLog.parking_id,
      gate_id: exitGateId,
      staff_id: staffId || null,
      direction: "Xe ra",
      event_time: exitTime,
      vehicle_type_id: vehicleTypeId || session.vehicle_type_id || null,
      plate_number: session.plate_number,
      ticket_type: resolvedTicketType,
      applied_price: finalFee,
      note:
        resolvedTicketType === "Thẻ tháng"
          ? "Xe tháng ra cổng (Miễn phí)"
          : "Xe lượt ra cổng dưới thời gian tính phí (Hoặc báo mất thẻ)",
    });
  }

  return {
    success: true,
    message: "Cho xe ra bãi thành công, mở cổng ra.",
    session: updatedSession,
  };
};
