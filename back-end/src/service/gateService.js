import supabase from "../config/supabaseClient.js";
import * as vehicleRepository from "../repositories/vehicleRepository.js";
import * as cardRepository from "../repositories/cardRepository.js";
import * as parkingRepository from "../repositories/parkingRepository.js";

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
    const { data: vehicles } = await supabase
      .from('vehicle')
      .select('plate_number')
      .limit(10);

    if (vehicles && vehicles.length > 0) {
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
    throw Object.assign(new Error("Biển số xe là bắt buộc."), { statusCode: 400 });
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
  const { data: packages } = await supabase
    .from('vehicle_package')
    .select('*')
    .eq('vehicle_id', vehicle.vehicle_id);

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
    vehicleType: "Thẻ tháng",
    plateNumber: cleanPlate,
    ownerName: vehicle.customer?.full_name || "Chủ xe tháng",
    cardCode: card.code,
    validUntil: card.expired_date || "Không giới hạn",
    canOpenGate,
    message
  };
};

/**
 * Lấy danh sách thẻ lượt khả dụng cho xe vãng lai
 */
const getVisitorEntryResponse = async (plateNumber) => {
  // Lấy các thẻ có trạng thái 'AVAILABLE' và loại 'Thẻ lượt'
  // const { data: cards, error } = await supabase
  //   .from('card')
  //   .select('card_id, code, type, status')
  //   .in('status', ['Hoạt động', 'Chưa sử dụng'])
  //   .in('type', ['Thẻ lượt', 'DAILY', 'Thẻ ngày']);

  const { data: cards, error } = await supabase
    .from('card')
    .select('card_id, code, type, status')
    .eq('type', 'Thẻ lượt')
    .eq('status', 'Hoạt động');
  if (error) throw new Error(error.message);

  return {
    vehicleType: "VISITOR",
    plateNumber,
    availableCards: cards || []
  };
};

/**
 * Xử lý cổng vào (Entry Gate Tap)
 */
export const entryTap = async ({ cardCode, plateNumber, entryVehicleImage, entryPlateImage }) => {
  if (!plateNumber || !plateNumber.trim()) {
    throw Object.assign(new Error("Biển số xe là bắt buộc."), { statusCode: 400 });
  }

  const cleanPlate = plateNumber.trim().toUpperCase();

  // Kiểm tra xe đã ở trong bãi chưa
  const activeSession = await parkingRepository.findActiveSessionByPlate(cleanPlate);
  if (activeSession) {
    throw Object.assign(new Error("Phương tiện đang ở trong bãi xe."), { statusCode: 400 });
  }

  // 1. Phân loại theo tham số truyền lên: nếu có cardCode -> Visitor, nếu không -> Monthly
  if (cardCode) {
    // --- LƯỢT XE VÃNG LAI (VISITOR) ---
    // Validate thẻ
    const card = await cardRepository.findByCode(cardCode);
    if (!card) {
      throw Object.assign(new Error(`Thẻ ${cardCode} không tồn tại trong hệ thống.`), { statusCode: 404 });
    }

    const isAvailable = card.status === 'Hoạt động';
    const isDaily = card.type === 'Thẻ lượt';

    if (!isAvailable) {
      throw Object.assign(new Error("Thẻ hiện không ở trạng thái hoạt động."), { statusCode: 400 });
    }
    if (!isDaily) {
      throw Object.assign(new Error("Thẻ được chọn không phải là thẻ lượt."), { statusCode: 400 });
    }

    // Tìm hoặc tạo xe tạm thời cho Visitor
    let vehicle = await vehicleRepository.findByPlateNumber(cleanPlate);
    if (!vehicle) {
      // Lấy vehicle_type_id mặc định (thường là Motorbike)
      const { data: vtList } = await supabase
        .from('vehicle_type')
        .select('vehicle_type_id')
        .eq('name', 'Motorbike')
        .limit(1);

      let vtId = vtList && vtList.length > 0 ? vtList[0].vehicle_type_id : null;
      if (!vtId) {
        // Fallback lấy loại xe đầu tiên
        const { data: allVt } = await supabase.from('vehicle_type').select('vehicle_type_id').limit(1);
        vtId = allVt && allVt.length > 0 ? allVt[0].vehicle_type_id : null;
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
    const session = await parkingRepository.createParkingSession({
      vehicle_id: vehicle.vehicle_id,
      plate_number: cleanPlate,
      entry_vehicle_image: entryVehicleImage || null,
      entry_plate_image: entryPlateImage || null,
      card_id: card.card_id
    });

    // Tạo liên kết tạm thời giữa thẻ lượt và xe
    await cardRepository.createRegistration(card.card_id, vehicle.vehicle_id, 'ACTIVE');

    // Cập nhật trạng thái thẻ sang ACTIVE
    await cardRepository.updateStatus(card.card_id, 'ACTIVE');

    return { success: true, message: "Check in Visitor thành công.", session };
  } else {
    // --- LƯỢT XE THÁNG (MONTHLY) ---
    // Backend tự xác định thẻ
    const vehicle = await vehicleRepository.findByPlateNumber(cleanPlate);
    if (!vehicle) {
      throw Object.assign(new Error(`Không tìm thấy phương tiện đăng ký cho biển số ${cleanPlate}.`), { statusCode: 404 });
    }

    // Lấy liên kết thẻ tháng
    const activeReg = await cardRepository.findActiveRegistrationByVehicle(vehicle.vehicle_id);
    if (!activeReg || !activeReg.card) {
      throw Object.assign(new Error("Xe chưa được liên kết với thẻ nào hoặc thẻ đã bị khóa."), { statusCode: 400 });
    }

    const card = activeReg.card;
    if (card.type !== 'Thẻ tháng' && card.type !== 'MONTHLY') {
      throw Object.assign(new Error("Thẻ liên kết của xe không phải loại Thẻ tháng."), { statusCode: 400 });
    }

    // Kiểm tra đăng ký hợp lệ
    const preCheckResult = await preCheckEntry(cleanPlate);
    if (!preCheckResult.canOpenGate) {
      throw Object.assign(new Error(preCheckResult.message), { statusCode: 400 });
    }

    // Tạo phiên gửi xe
    const session = await parkingRepository.createParkingSession({
      vehicle_id: vehicle.vehicle_id,
      plate_number: cleanPlate,
      entry_vehicle_image: entryVehicleImage || null,
      entry_plate_image: entryPlateImage || null,
      card_id: card.card_id
    });

    return { success: true, message: "Check in Monthly thành công. Mở cổng vào.", session };
  }
};

/**
 * Kiểm tra thông tin xe trước khi ra (Exit Pre-check)
 */
export const preCheckExit = async (plateNumber) => {
  if (!plateNumber || !plateNumber.trim()) {
    throw Object.assign(new Error("Biển số xe là bắt buộc."), { statusCode: 400 });
  }

  const cleanPlate = plateNumber.trim().toUpperCase();

  // 1. Tìm phiên gửi xe đang hoạt động
  const activeSession = await parkingRepository.findActiveSessionByPlate(cleanPlate);
  if (!activeSession) {
    throw Object.assign(new Error(`Không tìm thấy xe ${cleanPlate} trong bãi.`), { statusCode: 404 });
  }

  // 2. Tìm thông tin xe
  const vehicle = await vehicleRepository.findByPlateNumber(cleanPlate);

  let card = null;
  let isMonthly = false;

  if (activeSession.card_id) {
    card = await cardRepository.findById(activeSession.card_id);
    if (card) {
      isMonthly = card.type === 'Thẻ tháng' || card.type === 'MONTHLY';
    }
  }

  if (!card && vehicle) {
    const activeReg = await cardRepository.findActiveRegistrationByVehicle(vehicle.vehicle_id);
    if (activeReg && activeReg.card) {
      card = activeReg.card;
      isMonthly = card.type === 'Thẻ tháng' || card.type === 'MONTHLY';
    }
  }

  // 3. Tính toán thời gian
  let entryTimeStr = activeSession.entry_time;
  if (typeof entryTimeStr === "string" && !entryTimeStr.endsWith("Z") && !entryTimeStr.match(/[+-]\d{2}(:\d{2})?$/)) {
    entryTimeStr += "Z";
  }
  const entryTime = new Date(entryTimeStr);
  const exitTime = new Date();
  const diffMs = exitTime.getTime() - entryTime.getTime();
  const totalHours = diffMs / (1000 * 60 * 60);
  const billableHours = Math.max(1, Math.ceil(totalHours));

  const durationStr = `${billableHours}h`;
  const formattedEntryTime = entryTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  // 4. Tính toán phí gửi xe
  let fee = 0;
  if (!isMonthly) {
    fee = billableHours * 10000; // Mặc định 10k/h nếu không tìm thấy biểu phí

    if (vehicle && vehicle.vehicle_type_id) {
      try {
        const { data: priceItems } = await supabase
          .from("price_item")
          .select("price, min_hour, max_hour")
          .eq("vehicle_type_id", vehicle.vehicle_type_id);

        if (priceItems && priceItems.length > 0) {
          const matchingItem = priceItems.find(item => {
            const min = item.min_hour || 0;
            const max = item.max_hour;
            if (max === null || max === undefined) {
              return billableHours >= min;
            }
            return billableHours >= min && billableHours <= max;
          });

          if (matchingItem) {
            fee = Number(matchingItem.price);
          }
        }
      } catch (dbErr) {
        console.error("Lỗi tìm kiếm bảng phí, dùng mặc định:", dbErr);
      }
    }
  }

  return {
    vehicleType: isMonthly ? "MONTHLY" : "VISITOR",
    cardCode: card ? card.code : "UNKNOWN",
    entryTime: formattedEntryTime,
    duration: durationStr,
    fee
  };
};

/**
 * Xử lý cổng ra (Exit Gate Tap)
 */
export const exitTap = async ({ cardCode, plateNumber, exitVehicleImage, exitPlateImage }) => {
  const exitTime = new Date();

  if (cardCode) {
    // --- LƯỢT XE VÃNG LAI (VISITOR CHECK-OUT) ---
    const card = await cardRepository.findByCode(cardCode);
    if (!card) {
      throw Object.assign(new Error(`Thẻ ${cardCode} không tồn tại.`), { statusCode: 404 });
    }

    // Tìm liên kết đăng ký đang hoạt động của thẻ này
    const activeReg = await cardRepository.findActiveRegistrationByCard(card.card_id);
    if (!activeReg || !activeReg.vehicle) {
      throw Object.assign(new Error("Thẻ chưa được liên kết hoạt động với xe nào."), { statusCode: 400 });
    }

    const vehicle = activeReg.vehicle;

    // Tìm active session
    const activeSession = await parkingRepository.findActiveSessionByPlate(vehicle.plate_number);
    if (!activeSession) {
      throw Object.assign(new Error(`Không tìm thấy phiên gửi xe hoạt động cho xe ${vehicle.plate_number}.`), { statusCode: 404 });
    }

    // Cập nhật phiên gửi xe thành COMPLETED
    const updatedSession = await parkingRepository.updateParkingSession(activeSession.session_id, {
      exit_time: exitTime.toISOString(),
      exit_vehicle_image: exitVehicleImage || null,
      exit_plate_image: exitPlateImage || null,
      status: "COMPLETED"
    });

    // Giải phóng liên kết thẻ và xe (đổi status của registration sang INACTIVE)
    await cardRepository.deactivateRegistration(activeReg.registration_id);

    // Trả trạng thái thẻ về AVAILABLE
    await cardRepository.updateStatus(card.card_id, 'AVAILABLE');

    return { success: true, message: "Check out Visitor thành công. Cổng ra mở.", session: updatedSession };
  } else if (plateNumber) {
    // --- LƯỢT XE THÁNG (MONTHLY CHECK-OUT) ---
    const cleanPlate = plateNumber.trim().toUpperCase();

    const vehicle = await vehicleRepository.findByPlateNumber(cleanPlate);
    if (!vehicle) {
      throw Object.assign(new Error(`Không tìm thấy phương tiện đăng ký cho biển số ${cleanPlate}.`), { statusCode: 404 });
    }

    // Tìm active session
    const activeSession = await parkingRepository.findActiveSessionByPlate(cleanPlate);
    if (!activeSession) {
      throw Object.assign(new Error(`Không tìm thấy phiên gửi xe hoạt động cho xe ${cleanPlate}.`), { statusCode: 404 });
    }

    // Cập nhật phiên gửi xe thành COMPLETED
    const updatedSession = await parkingRepository.updateParkingSession(activeSession.session_id, {
      exit_time: exitTime.toISOString(),
      exit_vehicle_image: exitVehicleImage || null,
      exit_plate_image: exitPlateImage || null,
      status: "COMPLETED"
    });

    // Đối với Monthly, không thay đổi trạng thái thẻ hay đăng ký thẻ. Thẻ vẫn tiếp tục ACTIVE.

    return { success: true, message: "Check out Monthly thành công. Cổng ra mở.", session: updatedSession };
  } else {
    throw Object.assign(new Error("Dữ liệu check-out không hợp lệ (cần truyền cardCode hoặc plateNumber)."), { statusCode: 400 });
  }
};
