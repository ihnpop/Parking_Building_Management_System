import supabase from "../config/supabaseClient.js";
import * as cardRepository from "../repositories/cardRepository.js";

export const getCards = async () => {
  const { data: cards, error: cardError } = await supabase
    .from('card')
    .select('card_id, code, type, expired_date, status, created_at')
    .eq('type', 'Thẻ lượt')
    .not('status', 'eq', 'Đã xóa');

  if (cardError) throw new Error(cardError.message);

  if (!cards || cards.length === 0) return [];

  const cardIds = cards.map(c => c.card_id);

  const { data: registrations, error: regError } = await supabase
    .from('card_registrations')
    .select(`
      card_id,
      status,
      vehicle (
        vehicle_id,
        plate_number,
        customer (
          customer_id,
          full_name,
          phone,
          email
        )
      )
    `)
    .in('card_id', cardIds);

  if (regError) throw new Error(regError.message);

  const regMap = {};
  registrations?.forEach(reg => {
    if (!regMap[reg.card_id]) {
      regMap[reg.card_id] = [];
    }
    regMap[reg.card_id].push(reg);
  });

  return await Promise.all(
    cards.map(async (item) => {
      const cardRegs = regMap[item.card_id] || [];
      const activeReg = cardRegs.find(r => r.status === 'Hoạt động') ?? null;

      let latestSession = null;

      if (activeReg?.vehicle?.vehicle_id) {
        const { data: sessions } = await supabase
          .from("parking_sessions")
          .select(`
            session_id,
            entry_time,
            exit_time
          `)
          .eq("vehicle_id", activeReg.vehicle.vehicle_id)
          .order("entry_time", { ascending: false })
          .limit(1);

        latestSession = sessions?.[0] || null;
      }
      return {
        card_id: item.card_id,
        code: item.code,
        type: item.type,
        expired_date: item.expired_date,
        status: item.status,
        created_at: item.created_at,
        plate: activeReg?.vehicle?.plate_number || "",
        fullName: activeReg?.vehicle?.customer?.full_name || "",
        phone: activeReg?.vehicle?.customer?.phone || "",
        email: activeReg?.vehicle?.customer?.email || "",
        check_in_time: latestSession?.entry_time || '',
        check_out_time: latestSession?.exit_time || '',
        customer_name: activeReg?.vehicle?.customer?.full_name || "Chưa đăng ký",
        vehicle_id: activeReg?.vehicle?.vehicle_id || null,
        customer_id: activeReg?.vehicle?.customer?.customer_id || null
      };
    })
  );
};

export const getMonthCardLogs = async () => {
  const { data, error } = await supabase
    .from("payment")
    .select(`
      payment_time,
      amount,
      status,
      parking_order (
        vehicle (
          plate_number,
          customer (
            full_name
          )
        )
      )
    `);

  if (error) throw new Error(error.message);

  return data.map((item, idx) => {
    const plate = item.parking_order?.vehicle?.plate_number || "Chưa có";
    const owner = item.parking_order?.vehicle?.customer?.full_name || "Khách vãng lai";
    const time = new Date(item.payment_time).toLocaleString('vi-VN');
    const amount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.amount);
    const status = (item.status === 'PAID' || item.status === 'Đã thanh toán')
      ? 'Thành công'
      : item.status === 'PENDING'
        ? 'Đang xử lý'
        : 'Thất bại';

    return {
      time,
      plate,
      owner,
      type: item.amount > 500000 ? 'Gia hạn' : 'Cấp mới',
      amount,
      status
    };
  });
};


export const createCard = async ({ type, startDate, plate, fullName, phone, email, durationMonths }) => {
  let cleanPlate = plate ? plate.trim() : undefined;
  if (cleanPlate) {
    cleanPlate = cleanPlate.replace(/[\s\.\-]/g, '').toUpperCase();
    const plateRegex = /^\d{2}[A-Z]\d{4,5}$/;
    if (!plateRegex.test(cleanPlate)) {
      throw new Error("Biển số xe không đúng định dạng xx(A-Z)xxxxx hoặc xx(A-Z)xxxx (Ví dụ: 29A12345)");
    }
  }

  // Validate plate uniqueness among active cards
  if (cleanPlate) {
    const { data: vehicle, error: vehicleErr } = await supabase
      .from('vehicle')
      .select('vehicle_id')
      .eq('plate_number', cleanPlate)
      .maybeSingle();

    if (vehicleErr) throw new Error(vehicleErr.message);

    if (vehicle) {
      const { data: activeReg, error: regCheckErr } = await supabase
        .from('card_registrations')
        .select(`
          registration_id,
          card (
            code
          )
        `)
        .eq('vehicle_id', vehicle.vehicle_id)
        .in('status', ['Hoạt động'])
        .maybeSingle();

      if (regCheckErr) throw new Error(regCheckErr.message);

      if (activeReg) {
        throw new Error(`Biển số xe ${cleanPlate} đã được đăng ký và đang hoạt động trên thẻ ${activeReg.card?.code || ''}.`);
      }
    }
  }

  let cardToUse = null;

  if (type === 'Thẻ lượt') {
    // Tìm thẻ lượt có trạng thái "Đang chờ" để tái sử dụng
    const { data: waitingCard, error: waitingCardErr } = await supabase
      .from('card')
      .select('*')
      .eq('type', 'Thẻ lượt')
      .eq('status', 'Đang chờ')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (waitingCardErr) throw new Error(waitingCardErr.message);

    if (waitingCard) {
      // Trường hợp 1: Tái sử dụng thẻ đang chờ, cập nhật lại trạng thái và ngày tạo
      const { data: updatedCard, error: updateErr } = await supabase
        .from('card')
        .update({
          status: 'Hoạt động',
          created_at: startDate || new Date().toISOString()
        })
        .eq('card_id', waitingCard.card_id)
        .select()
        .single();

      if (updateErr) throw new Error(updateErr.message);
      cardToUse = updatedCard;
    }
  }

  // Trường hợp 2 hoặc khi không phải Thẻ lượt hoặc không tìm thấy thẻ đang chờ
  if (!cardToUse) {
    // Generate a random unique code
    const generateCode = async () => {
      const random = `CARD${Math.floor(1000 + Math.random() * 9000)}`;
      const { data: existing } = await supabase.from('card').select('code').eq('code', random).maybeSingle();
      if (existing) return generateCode();
      return random;
    };
    const code = await generateCode();

    // For monthly cards, calculate the expired date based on durationMonths (default to 1 month if not provided)
    let expiredDate = null;
    if (type === 'Thẻ tháng') {
      const months = parseInt(durationMonths) || 1;
      const start = new Date(startDate);
      start.setMonth(start.getMonth() + months);
      expiredDate = start.toISOString().split('T')[0];
    }

    const { data: newCard, error: cardError } = await supabase
      .from('card')
      .insert({
        code,
        type,
        created_at: startDate,
        expired_date: expiredDate,
        status: 'Hoạt động',
      })
      .select()
      .single();

    if (cardError) throw new Error(cardError.message);
    cardToUse = newCard;
  }

  // Link to vehicle if plate is provided
  if (cleanPlate) {
    // Check if vehicle with plate exists
    let { data: vehicle, error: vehicleErr } = await supabase
      .from('vehicle')
      .select('vehicle_id')
      .eq('plate_number', cleanPlate)
      .maybeSingle();

    if (vehicleErr) throw new Error(vehicleErr.message);

    if (!vehicle) {
      let customerId = null;

      // If it's a monthly card, create/use customer
      if (type === 'Thẻ tháng') {
        const { data: customer, error: custErr } = await supabase
          .from('customer')
          .insert({
            full_name: fullName || `Chủ xe ${cleanPlate}`,
            phone: phone || null,
            email: email || null,
            status: 'Hoạt động'
          })
          .select()
          .single();

        if (custErr) throw new Error(custErr.message);
        customerId = customer ? customer.customer_id : null;
      }

      // Fetch first active vehicle type
      const { data: vtList, error: vtErr } = await supabase
        .from('vehicle_type')
        .select('vehicle_type_id')
        .limit(1);

      if (vtErr) throw new Error(vtErr.message);
      const vehicleTypeId = vtList && vtList.length > 0 ? vtList[0].vehicle_type_id : null;

      if (!vehicleTypeId) {
        throw new Error("Không tìm thấy loại xe nào trong hệ thống. Vui lòng cấu hình loại xe trước.");
      }

      // Insert new vehicle
      const { data: newVehicle, error: insertVehErr } = await supabase
        .from('vehicle')
        .insert({
          customer_id: customerId,
          vehicle_type_id: vehicleTypeId,
          plate_number: cleanPlate,
          status: 'Hoạt động'
        })
        .select()
        .single();

      if (insertVehErr) throw new Error(insertVehErr.message);
      vehicle = newVehicle;
    }

    // Link card to vehicle via card_registrations
    const { error: regErr } = await supabase
      .from('card_registrations')
      .insert({
        card_id: cardToUse.card_id,
        vehicle_id: vehicle.vehicle_id,
        status: 'Hoạt động',
        created_at: startDate
      });

    if (regErr) throw new Error(regErr.message);
  }

  return cardToUse;
};

export const deleteCard = async (cardId, currentUserId) => {
  // 1. Kiểm tra card tồn tại
  const card = await cardRepository.findById(cardId);
  if (!card) {
    throw new Error("Không tìm thấy card");
  }

  const statusUpper = (card.status || '').toUpperCase();

  // 2. Chặn xóa nếu thẻ đang hoạt động
  if (statusUpper === 'HOẠT ĐỘNG') {
    throw new Error("Không thể xóa card hoạt động");
  }

  // 3. Chặn xóa nếu thẻ đã bị khóa (đã từng xóa mềm trước đó)
  if (statusUpper === 'ĐÃ KHÓA') {
    throw new Error("Không thể xóa thẻ đã khóa");
  }

  // 4. Chỉ còn lại trạng thái "Đang chờ" được phép xóa
  if (statusUpper !== 'ĐANG CHỜ') {
    throw new Error("Chỉ có thể xóa thẻ ở trạng thái Đang chờ");
  }

  // 5. Thực hiện Soft Delete thông qua Repository
  await cardRepository.softDelete(cardId, currentUserId);
  return { success: true };
};

export const getLostCards = async () => {
  // 1. Thực hiện truy vấn kết nối tầng từ bảng card_lost_log
  const { data, error } = await supabase
    .from('card_lost_log')
    .select(`
      lost_report_id,
      reported_at,
      status,
      description,
      handled_by,
      card ( code, type ),
      vehicle (
        plate_number,
        customer ( full_name )
      ),
      profiles ( full_name )
    `)
    .order('reported_at', { ascending: false });

  if (error) {
    console.error("Lỗi khi truy vấn nhật ký mất thẻ:", error);
    throw new Error(error.message);
  }

  // 2. Chuẩn hóa và làm phẳng cấu trúc dữ liệu JSON trả về
  return data.map((log, idx) => {
    const reportId = log.lost_report_id ? log.lost_report_id.substring(0, 8).toUpperCase() : `LR-${idx + 1}`;
    const cardCode = log.card?.code || "Không rõ";
    const plateNumber = log.vehicle?.plate_number || "Chưa có xe";
    const customerName = log.vehicle?.customer?.full_name || "Khách vãng lai";

    // Nếu card là null (không có đăng ký thẻ) -> thẻ lượt, ngược lại lấy type từ card
    const cardType = log.card?.type || "Thẻ lượt";

    // Nếu rỗng (NULL - Chờ xử lý) thì hiển thị gạch ngang thanh lịch "---"
    const handlerName = log.profiles?.full_name || "---";

    // PHÂN LOẠI CHÍNH XÁC THÀNH 3 TRẠNG THÁI HIỂN THỊ TIẾNG VIỆT
    let statusText = 'Đang xử lý';
    const statusVal = log.status || '';
    if (statusVal === 'Đã xử lý xong' || statusVal === 'Đã xong' || statusVal === 'Đã tìm lại') {
      statusText = 'Đã xong';
    } else if (statusVal === 'Đã hủy thẻ') {
      statusText = 'Đã hủy thẻ';
    } else if (statusVal === 'Chờ xử lý' || !statusVal) {
      if (!log.handled_by) {
        statusText = 'Chờ xử lý';
      } else {
        statusText = 'Đang xử lý';
      }
    }
    // Trường hợp còn lại: status vẫn là 'Chờ xử lý' nhưng đã có handled_by
    // (nhân viên đã bắt đầu xử lý) -> giữ giá trị default 'Đang xử lý' ở trên

    return {
      // Khớp hoàn toàn cả định dạng trường cũ (Dự phòng cho UI)
      id: reportId,
      cardNo: cardCode,
      plate: plateNumber,
      card_type: cardType,
      owner: customerName,
      date: log.reported_at,
      handler: handlerName,

      // Khớp hoàn toàn định dạng trường phẳng mới
      lost_report_id: reportId,
      card_code: cardCode,
      plate_number: plateNumber,
      customer_name: customerName,
      reported_at: log.reported_at,
      handler_name: handlerName,

      status: statusText
    };
  });
};

/**
 * Tạo báo cáo mất thẻ mới.
 * Chỉ cần nhập biển số xe và lí do - hệ thống tự động tra cứu vehicle và card.
 */
export const createLostCard = async ({
  plate_number,
  description
}) => {
  // Biển số xe là trường bắt buộc
  if (!plate_number) {
    throw new Error("Vui lòng nhập biển số xe.");
  }

  // 1. Tra cứu vehicle_id từ biển số xe
  const { data: vehicle, error: vehicleErr } = await supabase
    .from('vehicle')
    .select('vehicle_id')
    .eq('plate_number', plate_number)
    .maybeSingle();

  if (vehicleErr) {
    throw new Error(vehicleErr.message);
  }
  if (!vehicle) {
    throw new Error(`Không tìm thấy xe có biển số ${plate_number}`);
  }

  // 2. Tìm thẻ đang gắn với xe qua bảng card_registrations
  //    Ưu tiên thẻ ACTIVE / Hoạt động, nếu không có thì lấy bất kỳ thẻ nào đã đăng ký
  let finalCardId = null;

  // 2a. Tìm thẻ có trạng thái ACTIVE hoặc Hoạt động
  const { data: activeReg, error: activeErr } = await supabase
    .from('card_registrations')
    .select('card_id')
    .eq('vehicle_id', vehicle.vehicle_id)
    .in('status', ['Hoạt động'])
    .limit(1)
    .maybeSingle();

  if (activeErr) {
    throw new Error(activeErr.message);
  }

  if (activeReg) {
    finalCardId = activeReg.card_id;
  } else {
    // 2b. Không có thẻ ACTIVE -> tìm bất kỳ thẻ nào đã đăng ký với xe
    const { data: anyReg, error: anyErr } = await supabase
      .from('card_registrations')
      .select('card_id')
      .eq('vehicle_id', vehicle.vehicle_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (anyErr) {
      throw new Error(anyErr.message);
    }
    if (anyReg) {
      finalCardId = anyReg.card_id;
    }
  }

  // 2c. Nếu vẫn không tìm thấy thẻ -> tìm qua bảng parking_order
  if (!finalCardId) {
    const { data: order, error: orderErr } = await supabase
      .from('parking_order')
      .select('card_id')
      .eq('vehicle_id', vehicle.vehicle_id)
      .not('card_id', 'is', null)
      .order('check_in_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (orderErr) {
      throw new Error(orderErr.message);
    }
    if (order) {
      finalCardId = order.card_id;
    }
  }

  // Nếu không tìm được thẻ nào liên kết với xe -> báo lỗi (DB yêu cầu card_id NOT NULL)
  if (!finalCardId) {
    throw new Error(`Xe biển số ${plate_number} chưa được gắn thẻ nào trong hệ thống. Vui lòng đăng ký thẻ trước.`);
  }

  // Lấy thông tin thẻ để kiểm tra loại thẻ
  const { data: cardObj, error: cardErr } = await supabase
    .from('card')
    .select('type')
    .eq('card_id', finalCardId)
    .maybeSingle();

  if (cardErr) {
    throw new Error(cardErr.message);
  }

  // Nếu không tìm thấy thẻ hoặc loại thẻ không phải 'Thẻ tháng' -> là thẻ lượt
  const isDailyCard = !cardObj || cardObj.type !== 'Thẻ tháng';

  if (isDailyCard) {
    // Nếu là thẻ lượt, chủ xe trong database (customer_id) sẽ là null
    const { error: updateErr } = await supabase
      .from('vehicle')
      .update({ customer_id: null })
      .eq('vehicle_id', vehicle.vehicle_id);

    if (updateErr) {
      console.error("Lỗi khi cập nhật customer_id thành null cho thẻ lượt:", updateErr.message);
    }
  }

  // 3. Thêm mới bản ghi vào bảng nhật ký mất thẻ card_lost_log
  const { data, error } = await supabase
    .from('card_lost_log')
    .insert({
      card_id: finalCardId,
      vehicle_id: vehicle.vehicle_id,
      description: description || "Báo mất thẻ",
      reported_at: new Date().toISOString(),
      status: 'Chờ xử lý',            // Mặc định trạng thái Chờ xử lý
      handled_by: null              // Chưa có nhân viên xử lý
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};


export const getLostCardLogs = getLostCards;

export const updateCard = async (
  cardId,
  payload
) => {

  const {
    plate,
    status,
    checkInTime,
    checkOutTime
  } = payload;

  // =========================
  // Lấy thông tin card
  // =========================

  const {
    data: card,
    error: cardError
  } = await supabase
    .from("card")
    .select("*")
    .eq("card_id", cardId)
    .single();

  if (cardError) {
    throw new Error(cardError.message);
  }

  // TH5
  if (card.status === "Đã khóa") {
    throw new Error(
      "Thẻ đã khóa, không được phép cập nhật"
    );
  }

  let cleanPlate = plate?.trim() || "";

  if (cleanPlate) {

    cleanPlate = cleanPlate
      .replace(/[\s.-]/g, "")
      .toUpperCase();

    const plateRegex =
      /^\d{2}[A-Z]\d{4,5}$/;

    if (!plateRegex.test(cleanPlate)) {
      throw new Error(
        "Biển số xe không đúng định dạng"
      );
    }
  }

  // =========================
  // registration hiện tại
  // =========================

  const {
    data: registration
  } = await supabase
    .from("card_registrations")
    .select(`
      registration_id,
      vehicle_id
    `)
    .eq("card_id", cardId)
    .eq("status", "Hoạt động")
    .maybeSingle();

  // ==================================================
  // TH4
  // Hoạt động -> Đang chờ
  // clear biển số
  // ==================================================

  if (
    status === "Đang chờ" &&
    registration
  ) {

    await supabase
      .from("card_registrations")
      .delete()
      .eq(
        "registration_id",
        registration.registration_id
      );

    await supabase
      .from("card")
      .update({
        status: "Đang chờ"
      })
      .eq("card_id", cardId);

    return {
      success: true
    };
  }

  // ==================================================
  // TH2
  // Đang chờ + nhập biển số
  // => Hoạt động
  // ==================================================

  if (
    !registration &&
    cleanPlate
  ) {

    if (!cleanPlate) {
      throw new Error(
        "Vui lòng nhập biển số xe"
      );
    }

    let vehicleId = null;

    const {
      data: existingVehicle
    } = await supabase
      .from("vehicle")
      .select("*")
      .eq(
        "plate_number",
        cleanPlate
      )
      .maybeSingle();

    if (existingVehicle) {

      const {
        data: usedReg
      } = await supabase
        .from("card_registrations")
        .select("*")
        .eq(
          "vehicle_id",
          existingVehicle.vehicle_id
        )
        .eq(
          "status",
          "Hoạt động"
        )
        .maybeSingle();

      if (
        usedReg &&
        usedReg.card_id !== cardId
      ) {
        throw new Error(
          "Biển số đã được sử dụng"
        );
      }

      vehicleId =
        existingVehicle.vehicle_id;

    } else {

      const {
        data: vehicleType
      } = await supabase
        .from("vehicle_type")
        .select("vehicle_type_id")
        .limit(1)
        .single();

      const {
        data: newVehicle,
        error: vehicleError
      } = await supabase
        .from("vehicle")
        .insert({
          plate_number: cleanPlate,
          vehicle_type_id:
            vehicleType.vehicle_type_id,
          status: "Hoạt động"
        })
        .select()
        .single();

      if (vehicleError) {
        throw new Error(
          vehicleError.message
        );
      }

      vehicleId =
        newVehicle.vehicle_id;
    }

    const {
      error: regError
    } = await supabase
      .from("card_registrations")
      .insert({
        card_id: cardId,
        vehicle_id: vehicleId,
        status: "Hoạt động"
      });

    if (regError) {
      throw new Error(
        regError.message
      );
    }

    await supabase
      .from("card")
      .update({
        status: "Hoạt động"
      })
      .eq("card_id", cardId);

    return {
      success: true
    };
  }

  // ==================================================
  // TH3
  // Hoạt động nhưng không biển số
  // ==================================================

  if (
    card.status === "Hoạt động" &&
    !registration &&
    !cleanPlate
  ) {
    throw new Error(
      "Thẻ hoạt động bắt buộc phải có biển số"
    );
  }

  // ==================================================
  // TH1
  // Xóa biển số
  // ==================================================

  if (
    registration &&
    !cleanPlate
  ) {

    await supabase
      .from("card_registrations")
      .delete()
      .eq(
        "registration_id",
        registration.registration_id
      );

    await supabase
      .from("card")
      .update({
        status: "Đang chờ"
      })
      .eq("card_id", cardId);

    return {
      success: true
    };
  }

  // ==================================================
  // Cập nhật biển số
  // ==================================================

  if (
    registration &&
    cleanPlate
  ) {

    const {
      data: existingVehicle
    } = await supabase
      .from("vehicle")
      .select("*")
      .eq(
        "plate_number",
        cleanPlate
      )
      .maybeSingle();

    if (
      existingVehicle &&
      existingVehicle.vehicle_id !==
      registration.vehicle_id
    ) {

      const {
        data: activeReg
      } = await supabase
        .from("card_registrations")
        .select("*")
        .eq(
          "vehicle_id",
          existingVehicle.vehicle_id
        )
        .eq(
          "status",
          "Hoạt động"
        )
        .maybeSingle();

      if (
        activeReg &&
        activeReg.card_id !== cardId
      ) {
        throw new Error(
          "Biển số đã thuộc thẻ khác"
        );
      }

      await supabase
        .from("card_registrations")
        .update({
          vehicle_id:
            existingVehicle.vehicle_id
        })
        .eq(
          "registration_id",
          registration.registration_id
        );

    } else {

      await supabase
        .from("vehicle")
        .update({
          plate_number: cleanPlate
        })
        .eq(
          "vehicle_id",
          registration.vehicle_id
        );
    }

    const {
      data: session
    } = await supabase
      .from("parking_sessions")
      .select("session_id")
      .eq(
        "vehicle_id",
        registration.vehicle_id
      )
      .order(
        "entry_time",
        {
          ascending: false
        }
      )
      .limit(1)
      .maybeSingle();

    if (session) {

      await supabase
        .from("parking_sessions")
        .update({
          plate_number: cleanPlate,
          entry_time:
            checkInTime || null,
          exit_time:
            checkOutTime || null
        })
        .eq(
          "session_id",
          session.session_id
        );
    }

    await supabase
      .from("card")
      .update({
        status:
          cleanPlate
            ? "Hoạt động"
            : "Đang chờ"
      })
      .eq("card_id", cardId);
  }

  return {
    success: true
  };
};