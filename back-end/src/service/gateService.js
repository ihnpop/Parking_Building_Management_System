import * as vehicleRepository from "../repositories/vehicleRepository.js";
import * as cardRepository from "../repositories/cardRepository.js";
import * as parkingRepository from "../repositories/parkingRepository.js";
import * as gateRepository from "../repositories/gateRepository.js";
import AppError from "../utils/AppError.js";
import { getMatchingPriceItem, calculateDailyPlusFee, getDailyCeilingPrice } from "./feeCalculationService.js";

// ─── HÀM DÙNG CHUNG ────────────────────────────────────────────────────────

/**
 * Tính phí gửi xe theo công thức:
 *   Tổng phí = (Số ngày 24h đầy đủ × Giá trần ngày) + Phí số giờ lẻ còn lại
 *
 * @param {Date} entryTime  – Thời điểm xe vào
 * @param {Date} exitTime   – Thời điểm xe ra (hoặc thời điểm hiện tại khi pre-check)
 * @param {object|null} vehicle – Thông tin xe (cần vehicle_type_id)
 * @returns {Promise<{fee: number, totalHours: number, durationStr: string, formattedEntryTime: string}>}
 */
export const calculateParkingFee = async (entryTime, exitTime, vehicle) => {
  const diffMs = exitTime.getTime() - entryTime.getTime();
  const totalHours = diffMs / (1000 * 60 * 60);
  const billableHours = Math.max(1, Math.ceil(totalHours));

  const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  const formattedEntryTime = entryTime.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  let targetVehicle = vehicle;
  if (typeof vehicle === "string") {
    targetVehicle = await vehicleRepository.findByPlateNumber(vehicle);
  } else if ((!targetVehicle || !targetVehicle.vehicle_type_id) && targetVehicle?.plate_number) {
    targetVehicle = await vehicleRepository.findByPlateNumber(targetVehicle.plate_number);
  }

  const vehicleTypeId = targetVehicle?.vehicle_type_id || (typeof targetVehicle?.vehicle_type === 'object' ? targetVehicle?.vehicle_type?.vehicle_type_id : null);

  // Fallback mặc định: dưới 30 phút miễn phí, còn lại 10.000đ/giờ
  let fee = totalHours < 0.5 ? 0 : billableHours * 10000;

  if (vehicleTypeId) {
    try {
      const priceItems = await gateRepository.getPriceItems(vehicleTypeId);
      if (priceItems?.length > 0) {
        const result = calculateDailyPlusFee(totalHours, priceItems);
        fee = result.estimated_fee;
      }
    } catch (dbErr) {
      console.error("[gateService] Lỗi tra cứu bảng phí, dùng mặc định:", dbErr.message);
    }
  }

  return { fee, totalHours, durationStr, formattedEntryTime };
};

/**
 * Chuẩn hóa entry_time thành Date object.
 * Xử lý trường hợp timestamp không có timezone suffix.
 *
 * @param {string} entryTimeRaw
 * @returns {Date}
 */
export const parseEntryTime = (entryTimeRaw) => {
  let entryTimeStr = entryTimeRaw;
  if (typeof entryTimeStr === "string" && !entryTimeStr.endsWith("Z") && !entryTimeStr.match(/[+-]\d{2}(:\d{2})?$/)) {
    entryTimeStr += "Z";
  }
  return new Date(entryTimeStr);
};

/**
 * Lấy thông tin gate và parking dựa trên staffId.
 * Dùng chung cho entryTap và exitTap.
 *
 * @param {string} staffId
 * @param {string|null} gateId – có thể truyền từ frontend
 * @returns {Promise<{buildingId: string, finalGateId: string, finalParkingId: string}>}
 */
const resolveStaffGateParking = async (staffId, gateId) => {
  if (!staffId) {
    throw new AppError("Yêu cầu đăng nhập để thực hiện.", 401);
  }

  const { profile, error: profileErr } = await gateRepository.getStaffProfile(staffId);
  if (profileErr || !profile) {
    throw new AppError("Không tìm thấy thông tin tài khoản nhân viên.", 404);
  }

  const buildingId = profile.building_id;
  if (!buildingId) {
    throw new AppError("Tài khoản của bạn chưa được phân công tòa nhà. Không thể thực hiện Check-in/Check-out.", 403);
  }

  let finalGateId = gateId;
  let finalParkingId = null;

  if (finalGateId) {
    const gateObj = await gateRepository.getGateParkingId(finalGateId);
    if (gateObj) finalParkingId = gateObj.parking_id;
  }

  if (!finalGateId || !finalParkingId) {
    const parking = await gateRepository.getParkingByBuilding(buildingId);
    if (parking) {
      finalParkingId = parking.parking_id;
      const gate = await gateRepository.getGateByParking(finalParkingId);
      if (gate) finalGateId = gate.gate_id;
    }
  }

  if (!finalGateId || !finalParkingId) {
    throw new AppError("Không tìm thấy cấu hình bãi đỗ xe hoặc cổng tương ứng với tòa nhà này.", 400);
  }

  return { buildingId, finalGateId, finalParkingId };
};

/**
 * Giả lập OCR: nhận diện biển số từ ảnh upload
 * @param {string} fileName Tên file ảnh
 * @returns {Promise<string>} Biển số nhận diện được
 */
export const simulateOCR = async (fileName) => {
  // Tìm kiếm biển số trong tên file bằng regex
  // Ví dụ: "59A12345.jpg" -> "59A-12345"
  const cleanName = fileName || "";
  const match = cleanName.match(/(\d{2}[A-Z\d]+)-?(\d+)/i);
  if (match) {
    const part1 = match[1].toUpperCase();
    const part2 = match[2];
    return `${part1}-${part2}`;
  }

  // Nếu không tìm thấy, lấy ngẫu nhiên 1 biển số đã có trong DB của Xe tháng để mô phỏng cho thật
  try {
    const vehicles = await gateRepository.getRandomVehiclePlates(10);
    if (vehicles.length > 0) {
      const randomIndex = Math.floor(Math.random() * vehicles.length);
      return vehicles[randomIndex].plate_number;
    }
  } catch (err) {
    console.error("OCR Simulator: Lỗi lấy biển số ngẫu nhiên từ DB:", err);
  }

  return "59X2-00001"; // Biển số mặc định
};

/**
 * Kiểm tra thông tin xe trước khi vào (Entry Pre-check)
 */
export const preCheckEntry = async (plateNumber) => {
  if (!plateNumber || !plateNumber.trim()) {
    throw new AppError("Biển số xe là bắt buộc.", 400);
  }

  const cleanPlate = plateNumber.trim().toUpperCase();

  // 1. Tìm thông tin xe
  const vehicle = await vehicleRepository.findByPlateNumber(cleanPlate);

  // 2. Nếu không có xe trong DB -> Visitor
  if (!vehicle) {
    return await getVisitorEntryResponse(cleanPlate);
  }

  // 3. Nếu có xe -> kiểm tra liên kết thẻ hoạt động
  const activeReg = await cardRepository.findActiveRegistrationByVehicle(vehicle.vehicle_id);

  if (!activeReg || !activeReg.card) {
    // Xe tồn tại nhưng không có đăng ký thẻ hoạt động -> treat as Visitor
    return await getVisitorEntryResponse(cleanPlate);
  }

  const card = activeReg.card;
  const isMonthly = card.type === 'Thẻ tháng';

  if (!isMonthly) {
    // Liên kết là thẻ lượt -> treat as Visitor
    return await getVisitorEntryResponse(cleanPlate);
  }

  // 4. Nếu xe tháng -> kiểm tra các điều kiện hoạt động
  let canOpenGate = true;
  let message = "Hợp lệ - Có thể mở cổng.";

  const isCardActive = card.status === 'Hoạt động';
  const isVehicleActive = vehicle.status === 'Hoạt động';

  // Kiểm tra thời hạn đăng ký
  let isSubscriptionValid = true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (card.expired_date) {
    const expDate = new Date(card.expired_date);
    if (expDate < today) {
      isSubscriptionValid = false;
    }
  }

  // Kiểm tra gói cước xe (vehicle_package)
  const packages = await gateRepository.getVehiclePackages(vehicle.vehicle_id);

  if (packages && packages.length > 0) {
    // Nếu có đăng ký gói, kiểm tra xem có gói nào ACTIVE và chưa hết hạn không
    const activePkg = packages.find(pkg => {
      const isPkgActive = pkg.status === 'Hoạt động';
      const isPkgNotExpired = new Date(pkg.end_date) >= today;
      return isPkgActive && isPkgNotExpired;
    });

    if (!activePkg) {
      isSubscriptionValid = false;
    }
  }

  // Kiểm tra xe đang gửi trong bãi chưa
  const activeSession = await parkingRepository.findActiveSessionByPlate(cleanPlate);
  const isAlreadyParking = !!activeSession;

  if (!isCardActive) {
    canOpenGate = false;
    message = "Thẻ tháng đã bị khóa hoặc chưa được kích hoạt.";
  } else if (!isVehicleActive) {
    canOpenGate = false;
    message = "Phương tiện xe tháng đã bị vô hiệu hóa.";
  } else if (!isSubscriptionValid) {
    canOpenGate = false;
    message = "Gói cước / Thẻ đăng ký xe tháng đã hết hạn.";
  } else if (isAlreadyParking) {
    canOpenGate = false;
    message = "Phương tiện hiện đang ở trong bãi xe.";
  }

  return {
    vehicleType: "MONTHLY",
    plateNumber: cleanPlate,
    ownerName: vehicle.customer?.full_name || "Chủ xe tháng",
    cardCode: card.code,
    validUntil: card.expired_date || "Không giới hạn",
    vehicleCategory: vehicle.vehicle_type?.name || null,
    canOpenGate,
    message
  };
};

/**
 * Lấy danh sách thẻ lượt khả dụng cho xe vãng lai
 */
const getVisitorEntryResponse = async (plateNumber) => {
  const cards = await gateRepository.getAvailableVisitorCards();
  return {
    vehicleType: "VISITOR",
    plateNumber,
    availableCards: cards
  };
};

/**
 * Xử lý cổng vào (Entry Gate Tap)
 */
export const entryTap = async ({ cardCode, plateNumber, entryVehicleImage, entryPlateImage, vehicleType, staffId, gateId }) => {
  if (!plateNumber || !plateNumber.trim()) {
    throw new AppError("Biển số xe là bắt buộc.", 400);
  }

  const cleanPlate = plateNumber.trim().toUpperCase();

  // Kiểm tra xe đã ở trong bãi chưa
  const activeSession = await parkingRepository.findActiveSessionByPlate(cleanPlate);
  if (activeSession) {
    throw new AppError("Phương tiện đang ở trong bãi xe.", 400);
  }

  // Lấy thông tin gate/parking của Staff
  const { buildingId, finalGateId, finalParkingId } = await resolveStaffGateParking(staffId, gateId);

  let session = null;
  let vehicle = null;
  let cardIdVal = null;
  let ticketType = 'Thẻ lượt';

  // 1. Phân loại theo tham số truyền lên: nếu có cardCode -> Visitor, nếu không -> Monthly
  if (cardCode) {
    // --- LƯỢT XE VÃNG LAI (VISITOR) ---
    // Validate thẻ
    const card = await cardRepository.findByCode(cardCode);
    if (!card) {
      throw new AppError(`Thẻ ${cardCode} không tồn tại trong hệ thống.`, 404);
    }

    const isAvailable = card.status === 'Đang chờ';
    const isDaily = card.type === 'Thẻ lượt';

    if (!isAvailable) {
      throw new AppError("Thẻ hiện đã được sử dụng hoặc không ở trạng thái sẵn sàng.", 400);
    }
    if (!isDaily) {
      throw new AppError("Thẻ được chọn không phải là thẻ lượt.", 400);
    }

    cardIdVal = card.card_id;
    ticketType = 'Thẻ lượt';

    // Tìm hoặc tạo xe tạm thời cho Visitor
    vehicle = await vehicleRepository.findByPlateNumber(cleanPlate);
    if (!vehicle) {
      let vtId = null;
      let searchTypeName = 'Xe máy';
      if (vehicleType === 'Ô tô') {
        searchTypeName = 'Ô tô';
      } else if (vehicleType === 'Xe máy') {
        searchTypeName = 'Xe máy';
      }

      vtId = await gateRepository.getVehicleTypeId(searchTypeName);

      if (!vtId) {
        // Fallback lấy loại xe đầu tiên
        vtId = await gateRepository.getFallbackVehicleTypeId();
      }

      if (!vtId) {
        throw new Error("Không cấu hình được loại xe mặc định.");
      }

      vehicle = await vehicleRepository.createVehicle({
        plate_number: cleanPlate,
        vehicle_type_id: vtId
      });
    }

    // Tạo phiên gửi xe mới
    session = await parkingRepository.createParkingSession({
      vehicle_id: vehicle.vehicle_id,
      plate_number: cleanPlate,
      entry_plate_image: entryPlateImage || null,
      card_id: card.card_id,
      staff_in_id: staffId || null
    });

    // Tạo liên kết tạm thời giữa thẻ lượt và xe
    await cardRepository.createRegistration(card.card_id, vehicle.vehicle_id, 'Hoạt động');

    // Cập nhật trạng thái thẻ sang ACTIVE
    await cardRepository.updateStatus(card.card_id, 'Hoạt động');
  } else {
    // --- LƯỢT XE THÁNG (MONTHLY) ---
    // Backend tự xác định thẻ
    vehicle = await vehicleRepository.findByPlateNumber(cleanPlate);
    if (!vehicle) {
      throw new AppError(`Không tìm thấy phương tiện đăng ký cho biển số ${cleanPlate}.`, 404);
    }

    // Lấy liên kết thẻ tháng
    const activeReg = await cardRepository.findActiveRegistrationByVehicle(vehicle.vehicle_id);
    if (!activeReg || !activeReg.card) {
      throw new AppError("Xe chưa được liên kết với thẻ nào hoặc thẻ đã bị khóa.", 400);
    }

    const card = activeReg.card;
    if (card.type !== 'Thẻ tháng') {
      throw new AppError("Thẻ liên kết của xe không phải loại Thẻ tháng.", 400);
    }

    cardIdVal = card.card_id;
    ticketType = 'Thẻ tháng';

    // Kiểm tra đăng ký hợp lệ
    const preCheckResult = await preCheckEntry(cleanPlate);
    if (!preCheckResult.canOpenGate) {
      throw new AppError(preCheckResult.message, 400);
    }

    // Tạo phiên gửi xe
    session = await parkingRepository.createParkingSession({
      vehicle_id: vehicle.vehicle_id,
      plate_number: cleanPlate,
      entry_plate_image: entryPlateImage || null,
      card_id: card.card_id,
      staff_in_id: staffId || null
    });
  }

  // Ghi log vào entry_exit_log
  const logErr = await gateRepository.insertEntryExitLog({
    session_id: session.session_id,
    vehicle_id: vehicle.vehicle_id,
    card_id: cardIdVal,
    building_id: buildingId,
    parking_id: finalParkingId,
    gate_id: finalGateId,
    staff_id: staffId,
    direction: 'Xe vào',
    event_time: new Date().toISOString(),
    vehicle_type_id: vehicle.vehicle_type_id,
    plate_number: cleanPlate,
    ticket_type: ticketType,
    applied_price: 0,
    note: 'Nhân viên check-in xe vào bãi'
  });

  if (logErr) {
    throw new Error("Lỗi ghi nhật ký vào/ra: " + logErr.message);
  }

  return { success: true, message: cardCode ? "Check in vãng lai thành công." : "Check in thẻ tháng thành công. Mở cổng vào.", session };
};

/**
 * Kiểm tra thông tin xe trước khi ra (Exit Pre-check)
 */
export const preCheckExit = async (plateNumber) => {
  if (!plateNumber || !plateNumber.trim()) {
    throw new AppError("Biển số xe là bắt buộc.", 400);
  }

  const cleanPlate = plateNumber.trim().toUpperCase();

  // 1. Tìm phiên gửi xe đang hoạt động
  const activeSession = await parkingRepository.findActiveSessionByPlate(cleanPlate);
  if (!activeSession) {
    throw new AppError(`Không tìm thấy xe ${cleanPlate} trong bãi.`, 404);
  }

  // 2. Tìm thông tin xe
  const vehicle = await vehicleRepository.findByPlateNumber(cleanPlate);

  let card = null;
  let isMonthly = false;

  if (activeSession.card_id) {
    card = await cardRepository.findById(activeSession.card_id);
    if (card) {
      isMonthly = card.type === 'Thẻ tháng';
    }
  }

  if (!card && vehicle) {
    const activeReg = await cardRepository.findActiveRegistrationByVehicle(vehicle.vehicle_id);
    if (activeReg && activeReg.card) {
      card = activeReg.card;
      isMonthly = card.type === 'Thẻ tháng';
    }
  }

  // 3. Tính phí gửi xe (dùng helper chung)
  const entryTime = parseEntryTime(activeSession.entry_time);
  const exitTime = new Date();

  let fee = 0;
  let durationStr = "";
  let formattedEntryTime = "";

  if (!isMonthly) {
    const feeResult = await calculateParkingFee(entryTime, exitTime, vehicle);
    fee = feeResult.fee;
    durationStr = feeResult.durationStr;
    formattedEntryTime = feeResult.formattedEntryTime;
  } else {
    const diffMs = exitTime.getTime() - entryTime.getTime();
    const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    formattedEntryTime = entryTime.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  }

  return {
    vehicleType: isMonthly ? "MONTHLY" : "VISITOR",
    cardCode: card ? card.code : "UNKNOWN",
    entryTime: formattedEntryTime,
    duration: durationStr,
    fee,
    sessionId: activeSession.session_id,
    entryVehicleImage: activeSession.entry_vehicle_image,
    entryPlateImage: activeSession.entry_plate_image,
    plateNumber: activeSession.plate_number
  };
};

/**
 * Xử lý cổng ra (Exit Gate Tap)
 */
export const exitTap = async ({ cardCode, plateNumber, exitVehicleImage, exitPlateImage, staffId, gateId }) => {
  const exitTime = new Date();

  // Lấy thông tin gate/parking của Staff (dùng helper chung)
  const { buildingId, finalGateId, finalParkingId } = await resolveStaffGateParking(staffId, gateId);

  let session = null;
  let vehicle = null;
  let cardIdVal = null;
  let ticketType = 'Thẻ lượt';
  let fee = 0;

  if (cardCode) {
    // --- LƯỢT XE VÃNG LAI (VISITOR CHECK-OUT) ---
    const card = await cardRepository.findByCode(cardCode);
    if (!card) {
      throw new AppError(`Thẻ ${cardCode} không tồn tại.`, 404);
    }

    const activeReg = await cardRepository.findActiveRegistrationByCard(card.card_id);
    if (!activeReg || !activeReg.vehicle) {
      throw new AppError("Thẻ chưa được liên kết hoạt động với xe nào.", 400);
    }

    vehicle = activeReg.vehicle;
    cardIdVal = card.card_id;
    ticketType = 'Thẻ lượt';

    const activeSession = await parkingRepository.findActiveSessionByPlate(vehicle.plate_number);
    if (!activeSession) {
      throw new AppError(`Không tìm thấy phiên gửi xe hoạt động cho xe ${vehicle.plate_number}.`, 404);
    }

    // Tính phí gửi xe (dùng helper chung — xóa duplication)
    const entryTime = parseEntryTime(activeSession.entry_time);
    const feeResult = await calculateParkingFee(entryTime, exitTime, vehicle);
    fee = feeResult.fee;

    // Cập nhật phiên gửi xe thành COMPLETED
    session = await parkingRepository.updateParkingSession(activeSession.session_id, {
      exit_time: exitTime.toISOString(),
      exit_vehicle_image: exitVehicleImage || null,
      exit_plate_image: exitPlateImage || null,
      status: "Hoàn thành",
      final_fee: fee,
      staff_out_id: staffId || null
    });

    // Giải phóng liên kết thẻ và xe
    await cardRepository.deactivateRegistration(activeReg.registration_id);
    await cardRepository.updateStatus(card.card_id, 'Đang chờ');

    // Chèn thông tin payment cho xe vãng lai
    try {
      const existingPayment = await gateRepository.checkExistingPayment(activeSession.session_id, 'Vé lượt');
      if (!existingPayment) {
        const paymentErr = await gateRepository.insertPayment({
          session_id: activeSession.session_id,
          amount: fee,
          payment_method: 'Tiền mặt',
          status: 'Đã thanh toán',
          payment_time: exitTime.toISOString(),
          payment_type: 'Vé lượt',
          created_by: staffId || null
        });
        if (paymentErr) {
          console.error("[exitTap] Lỗi insert payment:", paymentErr.message);
        }
      }
    } catch (paymentEx) {
      console.error("[exitTap] Lỗi ngoại lệ khi insert payment:", paymentEx);
    }

  } else if (plateNumber) {
    // --- LƯỢT XE THÁNG (MONTHLY CHECK-OUT) ---
    const cleanPlate = plateNumber.trim().toUpperCase();

    vehicle = await vehicleRepository.findByPlateNumber(cleanPlate);
    if (!vehicle) {
      throw new AppError(`Không tìm thấy phương tiện đăng ký cho biển số ${cleanPlate}.`, 404);
    }

    const activeReg = await cardRepository.findActiveRegistrationByVehicle(vehicle.vehicle_id);
    if (activeReg?.card) {
      cardIdVal = activeReg.card.card_id;
    }
    ticketType = 'Thẻ tháng';
    fee = 0;

    const activeSession = await parkingRepository.findActiveSessionByPlate(cleanPlate);
    if (!activeSession) {
      throw new AppError(`Không tìm thấy phiên gửi xe hoạt động cho xe ${cleanPlate}.`, 404);
    }

    session = await parkingRepository.updateParkingSession(activeSession.session_id, {
      exit_time: exitTime.toISOString(),
      exit_vehicle_image: exitVehicleImage || null,
      exit_plate_image: exitPlateImage || null,
      status: "Hoàn thành",
      final_fee: 0,
      staff_out_id: staffId || null
    });
  } else {
    throw new AppError("Dữ liệu check-out không hợp lệ (cần truyền cardCode hoặc plateNumber).", 400);
  }

  // Ghi log vào entry_exit_log
  const logErr = await gateRepository.insertEntryExitLog({
    session_id: session.session_id,
    vehicle_id: vehicle.vehicle_id,
    card_id: cardIdVal,
    building_id: buildingId,
    parking_id: finalParkingId,
    gate_id: finalGateId,
    staff_id: staffId,
    direction: 'Xe ra',
    event_time: exitTime.toISOString(),
    vehicle_type_id: vehicle.vehicle_type_id,
    plate_number: vehicle.plate_number,
    ticket_type: ticketType,
    applied_price: fee,
    note: 'Nhân viên check-out xe ra khỏi bãi'
  });

  if (logErr) {
    throw new AppError("Lỗi ghi nhật ký vào/ra: " + logErr.message, 500);
  }

  return {
    success: true,
    message: cardCode ? "Check out thẻ lượt thành công. Cổng ra mở." : "Check out thẻ tháng thành công. Cổng ra mở.",
    session
  };
};

/**
 * Tính startOfDay / endOfDay cho một ngày cụ thể theo GMT+7.
 * @param {string|null} dateStr - Ngày dạng 'YYYY-MM-DD' (GMT+7). Nếu null thì dùng hôm nay.
 */
const getDayRange = (dateStr = null) => {
  const tzOffset = 7 * 60; // GMT+7 in minutes
  let start;
  if (dateStr) {
    // Parse ngày theo giờ địa phương GMT+7
    const [year, month, day] = dateStr.split('-').map(Number);
    // Tạo thời điểm 00:00:00 GMT+7 = UTC - 7h
    start = new Date(Date.UTC(year, month - 1, day) - tzOffset * 60 * 1000);
  } else {
    const now = new Date();
    const localTime = new Date(now.getTime() + tzOffset * 60 * 1000);
    start = new Date(Date.UTC(localTime.getUTCFullYear(), localTime.getUTCMonth(), localTime.getUTCDate()));
    start.setTime(start.getTime() - tzOffset * 60 * 1000);
  }
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { startOfDay: start, endOfDay: end };
};

/**
 * Lấy thống kê bãi xe theo ngày (mặc định hôm nay, GMT+7)
 * @param {string|null} dateStr - Ngày dạng 'YYYY-MM-DD'. Nếu null thì dùng hôm nay.
 */
export const getStats = async (dateStr = null) => {
  const { startOfDay, endOfDay } = getDayRange(dateStr);
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const isToday = !dateStr || dateStr === todayStr;

  // 1. Số lượng xe trong bãi (status = 'Đang gửi xe') — chỉ có nghĩa khi xem hôm nay
  let insideCount = 0;
  if (isToday) {
    insideCount = await gateRepository.countInsideVehicles();
  } else {
    // Với ngày trong quá khứ: đếm xe đang ở trong bãi tại thời điểm cuối ngày đó
    insideCount = await gateRepository.countInsideVehiclesAtEnd(endOfDay);
  }

  // 2. Xe đã vào trong ngày
  const inCount = await gateRepository.countVehiclesIn(startOfDay, endOfDay);

  // 3. Xe đã ra trong ngày
  const outCount = await gateRepository.countVehiclesOut(startOfDay, endOfDay);

  return {
    success: true,
    insideCount,
    inCount,
    outCount,
  };
};

/**
 * Lấy danh sách phiên gửi xe theo ngày (mặc định hôm nay, GMT+7), kèm thông tin card
 * @param {string|null} dateStr - Ngày dạng 'YYYY-MM-DD'. Nếu null thì dùng hôm nay.
 */
export const getSessions = async (dateStr = null) => {
  const { startOfDay, endOfDay } = getDayRange(dateStr);

  const sessions = await gateRepository.getSessionsByDateRange(startOfDay, endOfDay);

  if (!sessions || sessions.length === 0) {
    return { success: true, sessions: [] };
  }

  // Lấy danh sách card_id duy nhất để query thông tin thẻ
  const cardIds = [...new Set(sessions.map(s => s.card_id).filter(id => !!id))];
  let cardsMap = {};

  if (cardIds.length > 0) {
    const cards = await gateRepository.getCardsByIds(cardIds);
    if (cards) {
      cards.forEach(c => {
        cardsMap[c.card_id] = { code: c.code, type: c.type };
      });
    }
  }

  // Ghép thông tin card vào session bằng Javascript
  const mappedSessions = sessions.map(s => ({
    ...s,
    fee: s.final_fee || 0,
    card: s.card_id ? (cardsMap[s.card_id] || null) : null
  }));

  return { success: true, sessions: mappedSessions };
};
