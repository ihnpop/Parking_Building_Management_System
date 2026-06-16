import supabase from "../config/supabaseClient.js";

export const getCards = async () => {
  const { data, error } = await supabase
    .from('card')
    .select(`
      card_id,
      code,
      type,
      expired_date,
      status,
      created_at,
      card_registrations (
        status,
        vehicle (
          plate_number,
          customer (
            full_name
          )
        )
      )
    `);

  if (error) throw new Error(error.message);

  return data.map(item => {
    const activeReg = item.card_registrations?.find(r => r.status === 'ACTIVE') || item.card_registrations?.[0];
    return {
      card_id: item.card_id,
      code: item.code,
      type: item.type,
      expired_date: item.expired_date,
      status: item.status,
      created_at: item.created_at,
      plate: activeReg?.vehicle?.plate_number || "Chưa đăng ký",
      customer_name: activeReg?.vehicle?.customer?.full_name || "Chưa đăng ký"
    };
  });
};

export const getMonthCards = async () => {
  // const { data, error } = await supabase
  //   .from('card')
  //   .select('*')
  //   .like("type", "Thẻ tháng");

  // export const getMonthCards = async () => {
  const { data, error } = await supabase
    .from("card_registrations")
    .select(`
      registration_id,
      status,
      created_at,

      card!inner (
        card_id,
        code,
        type,
        expired_date,
        status,
        created_at
      ),

      vehicle (
        plate_number,

        customer (
          full_name
        ),

        vehicle_type (
          name
        )
      )
    `)
    .eq("card.type", "Thẻ tháng");

  if (error) throw new Error(error.message);

  // const { data: cards, error: cardError } = await supabase
  //   .from("card")
  //   .select("*")
  //   .like("type", "Thẻ tháng");

  const { data: cards, error: cardError } = await supabase
    .from("card_registrations")
    .select(`
      registration_id,
      status,
      created_at,

      card!inner (
        card_id,
        code,
        type,
        expired_date,
        status,
        created_at
      ),

      vehicle (
        plate_number,

        customer (
          full_name
        ),

        vehicle_type (
          name
        )
      )
    `)
    .eq("card.type", "Thẻ tháng");

  if (cardError) throw new Error(cardError.message);

  return data.map((vp, i) => {
    const cardCode = cards && cards[i % cards.length]
      ? cards[i % cards.length].code
      : `CARD-${i + 1000}`;

    let statusText = "Hoạt động";
    if (vp.status === 'EXPIRED') {
      statusText = "Đã hết hạn";
    } else if (new Date(vp.end_date) - new Date() < 7 * 24 * 60 * 60 * 1000) {
      statusText = "Sắp hết hạn";
    }

    return {
      id: String(i + 1).padStart(2, '0'),
      // cardNo: cardCode,
      cardNo: vp.card?.code,
      plate: vp.vehicle?.plate_number || "Chưa có",
      customer: vp.vehicle?.customer?.full_name || "Khách vãng lai",
      type: vp.vehicle?.vehicle_type?.name || "Xe máy",
      // startDate: new Date(vp.start_date).toLocaleDateString('vi-VN'),
      // endDate: new Date(vp.end_date).toLocaleDateString('vi-VN'),
      startDate: new Date(vp.card?.created_at).toLocaleDateString('vi-VN'),
      endDate: new Date(vp.card?.expired_date).toLocaleDateString('vi-VN'),
      status: statusText
    };
  });
};

export const getMonthCardLogs = async () => {
  const { data, error } = await supabase
    .from("payment")
    .select(`
      amount,
      payment_time,
      status,
      parking_order (
        card (code),
        vehicle (
          plate_number,
          customer (full_name)
        )
      )
    `)
    .limit(50);

  if (error) throw new Error(error.message);

  return data.map((item, idx) => {
    const cardCode = item.parking_order?.card?.code || `CARD-${1000 + idx}`;
    const plate = item.parking_order?.vehicle?.plate_number || "Chưa có";
    const owner = item.parking_order?.vehicle?.customer?.full_name || "Khách vãng lai";
    const time = new Date(item.payment_time).toLocaleString('vi-VN');
    const amount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.amount);
    const status = item.status === 'PAID'
      ? 'Thành công'
      : item.status === 'PENDING'
        ? 'Đang xử lý'
        : 'Thất bại';

    return {
      time,
      cardNo: cardCode,
      plate,
      owner,
      type: item.amount > 500000 ? 'Gia hạn' : 'Cấp mới',
      amount,
      status
    };
  });

}

export const createCard = async ({ type, startDate, plate, fullName, phone, email, durationMonths }) => {
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

  // Link to vehicle if plate is provided
  if (plate) {
    // Check if vehicle with plate exists
    let { data: vehicle, error: vehicleErr } = await supabase
      .from('vehicle')
      .select('vehicle_id')
      .eq('plate_number', plate)
      .maybeSingle();

    if (vehicleErr) throw new Error(vehicleErr.message);

    if (!vehicle) {
      let customerId = null;

      // If it's a monthly card, create/use customer
      if (type === 'Thẻ tháng') {
        const { data: customer, error: custErr } = await supabase
          .from('customer')
          .insert({
            full_name: fullName || `Chủ xe ${plate}`,
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
          plate_number: plate,
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
        card_id: newCard.card_id,
        vehicle_id: vehicle.vehicle_id,
        status: 'ACTIVE',
        created_at: startDate
      });

    if (regErr) throw new Error(regErr.message);
  }

  return newCard;
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

    // Nếu card là null (không có đăng ký thẻ) -> thẻ lượt, ngược lại lấy type từ card
    const cardType = log.card?.type || "Thẻ lượt";

    // Nếu rỗng (NULL - Chờ xử lý) thì hiển thị gạch ngang thanh lịch "---"
    const handlerName = log.profiles?.full_name || "---";

    // PHÂN LOẠI CHÍNH XÁC THÀNH 3 TRẠNG THÁI HIỂN THỊ TIẾNG VIỆT
    let statusText = 'Đang xử lý';
    if (log.status === 'RESOLVED' || log.status === 'Đã xử lý xong' || log.status === 'Đã xong') {
      statusText = 'Đã xong';
    } else if (log.status === 'PENDING' || !log.status) {
      if (!log.handled_by) {
        statusText = 'Chờ xử lý';
      } else {
        statusText = 'Đang xử lý';
      }
    } else if (log.status === 'CANCELED' || log.status === 'Đã hủy thẻ') {
      statusText = 'Đã hủy thẻ';
    }

    return {
      // Khớp hoàn toàn cả định dạng trường cũ (Dự phòng cho UI)
      id: reportId,
      cardNo: cardCode,
      plate: plateNumber,
      card_type: cardType,
      date: log.reported_at,
      handler: handlerName,

      // Khớp hoàn toàn định dạng trường phẳng mới
      lost_report_id: reportId,
      card_code: cardCode,
      plate_number: plateNumber,
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
  //    Ưu tiên thẻ ACTIVE, nếu không có thì lấy bất kỳ thẻ nào đã đăng ký
  let finalCardId = null;

  // 2a. Tìm thẻ có trạng thái ACTIVE
  const { data: activeReg, error: activeErr } = await supabase
    .from('card_registrations')
    .select('card_id')
    .eq('vehicle_id', vehicle.vehicle_id)
    .eq('status', 'ACTIVE')
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
      status: 'PENDING',            // Mặc định trạng thái Chờ xử lý
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
