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
    vehicleType: "MONTHLY",
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
    .eq('status', 'Đang chờ');
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
export const entryTap = async ({ cardCode, plateNumber, entryVehicleImage, entryPlateImage, vehicleType, staffId, gateId }) => {
  if (!plateNumber || !plateNumber.trim()) {
    throw Object.assign(new Error("Biển số xe là bắt buộc."), { statusCode: 400 });
  }

  const cleanPlate = plateNumber.trim().toUpperCase();

  // Kiểm tra xe đã ở trong bãi chưa
  const activeSession = await parkingRepository.findActiveSessionByPlate(cleanPlate);
  if (activeSession) {
    throw Object.assign(new Error("Phương tiện đang ở trong bãi xe."), { statusCode: 400 });
  }

  // Lấy tòa nhà của Staff
  if (!staffId) {
    throw Object.assign(new Error("Yêu cầu đăng nhập để thực hiện."), { statusCode: 401 });
  }
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('building_id')
    .eq('id', staffId)
    .maybeSingle();

  if (profileErr || !profile) {
    throw Object.assign(new Error("Không tìm thấy thông tin tài khoản nhân viên."), { statusCode: 404 });
  }

  const buildingId = profile.building_id;
  if (!buildingId) {
    throw Object.assign(new Error("Tài khoản của bạn chưa được phân công tòa nhà. Không thể thực hiện Check-in/Check-out."), { statusCode: 403 });
  }

  // Xác định gate_id và parking_id
  let finalGateId = gateId;
  let finalParkingId = null;

  if (finalGateId) {
    const { data: gateObj } = await supabase
      .from('gate')
      .select('parking_id')
      .eq('gate_id', finalGateId)
      .maybeSingle();
    if (gateObj) {
      finalParkingId = gateObj.parking_id;
    }
  }

  if (!finalGateId || !finalParkingId) {
    // Fallback: Tìm bãi đỗ xe thuộc tòa nhà của Staff
    const { data: parkings } = await supabase
      .from('parking')
      .select('parking_id')
      .eq('building_id', buildingId)
      .limit(1);

    if (parkings && parkings.length > 0) {
      finalParkingId = parkings[0].parking_id;
      // Tìm cổng của bãi đỗ xe này
      const { data: gates } = await supabase
        .from('gate')
        .select('gate_id')
        .eq('parking_id', finalParkingId)
        .limit(1);

      if (gates && gates.length > 0) {
        finalGateId = gates[0].gate_id;
      }
    }
  }

  if (!finalGateId || !finalParkingId) {
    throw Object.assign(new Error("Không tìm thấy cấu hình bãi đỗ xe hoặc cổng tương ứng với tòa nhà này."), { statusCode: 400 });
  }

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
      throw Object.assign(new Error(`Thẻ ${cardCode} không tồn tại trong hệ thống.`), { statusCode: 404 });
    }

    const isAvailable = card.status === 'Đang chờ';
    const isDaily = card.type === 'Thẻ lượt';

    if (!isAvailable) {
      throw Object.assign(new Error("Thẻ hiện đã được sử dụng hoặc không ở trạng thái sẵn sàng."), { statusCode: 400 });
    }
    if (!isDaily) {
      throw Object.assign(new Error("Thẻ được chọn không phải là thẻ lượt."), { statusCode: 400 });
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

      const { data: vtList } = await supabase
        .from('vehicle_type')
        .select('vehicle_type_id')
        .or(`name.eq."${vehicleType || 'Xe máy'}",name.eq."${searchTypeName}"`)
        .limit(1);

      vtId = vtList && vtList.length > 0 ? vtList[0].vehicle_type_id : null;

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
    session = await parkingRepository.createParkingSession({
      vehicle_id: vehicle.vehicle_id,
      plate_number: cleanPlate,
      entry_vehicle_image: entryVehicleImage || null,
      entry_plate_image: entryPlateImage || null,
      card_id: card.card_id
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
      throw Object.assign(new Error(`Không tìm thấy phương tiện đăng ký cho biển số ${cleanPlate}.`), { statusCode: 404 });
    }

    // Lấy liên kết thẻ tháng
    const activeReg = await cardRepository.findActiveRegistrationByVehicle(vehicle.vehicle_id);
    if (!activeReg || !activeReg.card) {
      throw Object.assign(new Error("Xe chưa được liên kết với thẻ nào hoặc thẻ đã bị khóa."), { statusCode: 400 });
    }

    const card = activeReg.card;
    if (card.type !== 'Thẻ tháng') {
      throw Object.assign(new Error("Thẻ liên kết của xe không phải loại Thẻ tháng."), { statusCode: 400 });
    }

    cardIdVal = card.card_id;
    ticketType = 'Thẻ tháng';

    // Kiểm tra đăng ký hợp lệ
    const preCheckResult = await preCheckEntry(cleanPlate);
    if (!preCheckResult.canOpenGate) {
      throw Object.assign(new Error(preCheckResult.message), { statusCode: 400 });
    }

    // Tạo phiên gửi xe
    session = await parkingRepository.createParkingSession({
      vehicle_id: vehicle.vehicle_id,
      plate_number: cleanPlate,
      entry_vehicle_image: entryVehicleImage || null,
      entry_plate_image: entryPlateImage || null,
      card_id: card.card_id
    });
  }

  // Ghi log vào entry_exit_log
  const { error: logErr } = await supabase
    .from('entry_exit_log')
    .insert({
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
export const exitTap = async ({ cardCode, plateNumber, exitVehicleImage, exitPlateImage, staffId, gateId }) => {
  const exitTime = new Date();

  // Lấy tòa nhà của Staff
  if (!staffId) {
    throw Object.assign(new Error("Yêu cầu đăng nhập để thực hiện."), { statusCode: 401 });
  }
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('building_id')
    .eq('id', staffId)
    .maybeSingle();

  if (profileErr || !profile) {
    throw Object.assign(new Error("Không tìm thấy thông tin tài khoản nhân viên."), { statusCode: 404 });
  }

  const buildingId = profile.building_id;
  if (!buildingId) {
    throw Object.assign(new Error("Tài khoản của bạn chưa được phân công tòa nhà. Không thể thực hiện Check-in/Check-out."), { statusCode: 403 });
  }

  // Xác định gate_id và parking_id
  let finalGateId = gateId;
  let finalParkingId = null;

  if (finalGateId) {
    const { data: gateObj } = await supabase
      .from('gate')
      .select('parking_id')
      .eq('gate_id', finalGateId)
      .maybeSingle();
    if (gateObj) {
      finalParkingId = gateObj.parking_id;
    }
  }

  if (!finalGateId || !finalParkingId) {
    const { data: parkings } = await supabase
      .from('parking')
      .select('parking_id')
      .eq('building_id', buildingId)
      .limit(1);

    if (parkings && parkings.length > 0) {
      finalParkingId = parkings[0].parking_id;
      const { data: gates } = await supabase
        .from('gate')
        .select('gate_id')
        .eq('parking_id', finalParkingId)
        .limit(1);

      if (gates && gates.length > 0) {
        finalGateId = gates[0].gate_id;
      }
    }
  }

  if (!finalGateId || !finalParkingId) {
    throw Object.assign(new Error("Không tìm thấy cấu hình bãi đỗ xe hoặc cổng tương ứng với tòa nhà này."), { statusCode: 400 });
  }

  let session = null;
  let vehicle = null;
  let cardIdVal = null;
  let ticketType = 'Thẻ lượt';
  let fee = 0;

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

    vehicle = activeReg.vehicle;
    cardIdVal = card.card_id;
    ticketType = 'Thẻ lượt';

    // Tìm active session
    const activeSession = await parkingRepository.findActiveSessionByPlate(vehicle.plate_number);
    if (!activeSession) {
      throw Object.assign(new Error(`Không tìm thấy phiên gửi xe hoạt động cho xe ${vehicle.plate_number}.`), { statusCode: 404 });
    }

    // Tính toán phí gửi xe
    let entryTimeStr = activeSession.entry_time;
    if (typeof entryTimeStr === "string" && !entryTimeStr.endsWith("Z") && !entryTimeStr.match(/[+-]\d{2}(:\d{2})?$/)) {
      entryTimeStr += "Z";
    }
    const entryTime = new Date(entryTimeStr);
    const diffMs = exitTime.getTime() - entryTime.getTime();
    const totalHours = diffMs / (1000 * 60 * 60);
    const billableHours = Math.max(1, Math.ceil(totalHours));

    fee = billableHours * 10000; // Giá mặc định 10k/giờ

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
        console.error("Lỗi tính toán phí khi checkout:", dbErr);
      }
    }

    // Cập nhật phiên gửi xe thành COMPLETED
    session = await parkingRepository.updateParkingSession(activeSession.session_id, {
      exit_time: exitTime.toISOString(),
      exit_vehicle_image: exitVehicleImage || null,
      exit_plate_image: exitPlateImage || null,
      status: "Hoàn thành"
    });

    // Giải phóng liên kết thẻ và xe (đổi status của registration sang INACTIVE)
    await cardRepository.deactivateRegistration(activeReg.registration_id);

    // Trả trạng thái thẻ về AVAILABLE
    await cardRepository.updateStatus(card.card_id, 'Đang chờ');

    // Chèn thông tin payment cho xe vãng lai (CASUAL)
    try {
      const { data: existingPayment } = await supabase
        .from('payment')
        .select('payment_id')
        .eq('session_id', activeSession.session_id)
        .eq('payment_type', 'CASUAL')
        .maybeSingle();

      if (!existingPayment) {
        const { error: paymentErr } = await supabase
          .from('payment')
          .insert({
            session_id: activeSession.session_id,
            amount: fee,
            payment_method: 'Cash',
            status: 'PAID',
            payment_time: exitTime.toISOString(),
            payment_type: 'CASUAL',
            created_by: staffId || null
          });
        if (paymentErr) {
          console.error("Lỗi insert payment checkout thẻ lượt:", paymentErr.message);
        }
      }
    } catch (paymentEx) {
      console.error("Lỗi ngoại lệ khi insert payment checkout thẻ lượt:", paymentEx);
    }

  } else if (plateNumber) {
    // --- LƯỢT XE THÁNG (MONTHLY CHECK-OUT) ---
    const cleanPlate = plateNumber.trim().toUpperCase();

    vehicle = await vehicleRepository.findByPlateNumber(cleanPlate);
    if (!vehicle) {
      throw Object.assign(new Error(`Không tìm thấy phương tiện đăng ký cho biển số ${cleanPlate}.`), { statusCode: 404 });
    }

    // Lấy liên kết thẻ tháng
    const activeReg = await cardRepository.findActiveRegistrationByVehicle(vehicle.vehicle_id);
    if (activeReg && activeReg.card) {
      cardIdVal = activeReg.card.card_id;
    }
    ticketType = 'Thẻ tháng';
    fee = 0; // Thẻ tháng miễn phí checkout theo lượt

    // Tìm active session
    const activeSession = await parkingRepository.findActiveSessionByPlate(cleanPlate);
    if (!activeSession) {
      throw Object.assign(new Error(`Không tìm thấy phiên gửi xe hoạt động cho xe ${cleanPlate}.`), { statusCode: 404 });
    }

    // Cập nhật phiên gửi xe thành COMPLETED
    session = await parkingRepository.updateParkingSession(activeSession.session_id, {
      exit_time: exitTime.toISOString(),
      exit_vehicle_image: exitVehicleImage || null,
      exit_plate_image: exitPlateImage || null,
      status: "Hoàn thành"
    });
  } else {
    throw Object.assign(new Error("Dữ liệu check-out không hợp lệ (cần truyền cardCode hoặc plateNumber)."), { statusCode: 400 });
  }

  // Ghi log vào entry_exit_log
  const { error: logErr } = await supabase
    .from('entry_exit_log')
    .insert({
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
    throw new Error("Lỗi ghi nhật ký vào/ra: " + logErr.message);
  }

  return { success: true, message: cardCode ? "Check out thẻ lượt thành công. Cổng ra mở." : "Check out Monthly thành công. Cổng ra mở.", session };
};
