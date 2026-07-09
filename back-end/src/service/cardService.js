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

    // Nội dung / lí do báo mất (nhập từ form tạo báo mất mới)
    const description = log.description || "";

    // PHÂN LOẠI TRẠNG THÁI HIỂN THỊ TIẾNG VIỆT
    // Từ khi có acceptLostCardReport/resolveLostCardReport (rule #4), status raw
    // trong DB đã tường minh theo từng bước (không cần suy luận qua handled_by nữa):
    //   'Đang chờ' (mới tạo) -> 'Đang xử lý' (đã tiếp nhận) -> 'Đã tìm lại' / 'Đã hủy thẻ' (đã đóng)
    const statusVal = log.status || '';
    let statusText;
    if (statusVal === 'Đã xử lý xong' || statusVal === 'Đã xong' || statusVal === 'Đã tìm lại') {
      statusText = 'Đã xong';
    } else if (statusVal === 'Đã hủy thẻ') {
      statusText = 'Đã hủy thẻ';
    } else if (statusVal === 'Đang xử lý') {
      statusText = 'Đang xử lý';
    } else {
      // Bao gồm raw value mới 'Đang chờ' (default của DB) và các giá trị rỗng/legacy khác
      statusText = 'Đang chờ';
    }

    return {
      // Khớp hoàn toàn cả định dạng trường cũ (Dự phòng cho UI)
      id: reportId,
      cardNo: cardCode,
      plate: plateNumber,
      card_type: cardType,
      owner: customerName,
      date: log.reported_at,
      handler: handlerName,
      reason: description,

      // Khớp hoàn toàn định dạng trường phẳng mới
      lost_report_id: reportId,          // dạng rút gọn (8 ký tự) - CHỈ để hiển thị
      raw_report_id: log.lost_report_id, // UUID gốc đầy đủ - BẮT BUỘC dùng khi gọi API accept/resolve
      card_code: cardCode,
      plate_number: plateNumber,
      customer_name: customerName,
      reported_at: log.reported_at,
      handler_name: handlerName,
      description,

      status: statusText
    };
  });
};

/**
 * Tạo báo cáo mất thẻ mới.
 * Chỉ cần nhập biển số xe và lí do - hệ thống tự động tra cứu vehicle và card.
 * @param {string} performedBy - id của nhân viên (profiles.id) thực hiện thao tác báo mất,
 *                                dùng để ghi audit log vào card_activity_logs (bắt buộc).
 */
export const createLostCard = async ({
  plate_number,
  description,
  performedBy
}) => {
  // Biển số xe là trường bắt buộc
  if (!plate_number) {
    throw new Error("Vui lòng nhập biển số xe.");
  }

  // performedBy bắt buộc theo business rule (rule #3 - audit trail): dù cột
  // card_activity_logs.performed_by ở schema hiện tại đã cho phép NULL, việc
  // ghi log mà không biết ai thực hiện là vô nghĩa cho mục đích tra soát,
  // nên vẫn bắt buộc tường minh ở tầng app.
  if (!performedBy) {
    throw new Error("Thiếu thông tin người thực hiện (performedBy) để ghi nhận audit log.");
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
      .order('time_in', { ascending: false })
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

  // RULE #2 - Chặn báo mất trùng lặp: không cho tạo report mới nếu thẻ này
  // đang có report chưa đóng. Lưu ý: trường status trong card_lost_log hiện tại
  // chỉ được set 'Đang chờ' lúc tạo và các giá trị "đóng" khi xử lý xong
  // ('Đã xong' / 'Đã xử lý xong' / 'Đã tìm lại' / 'Đã hủy thẻ'), nên ta loại trừ
  // các giá trị đã đóng thay vì liệt kê các giá trị "đang mở" để tránh bỏ sót.
  const CLOSED_LOST_STATUSES = ['Đã xong', 'Đã xử lý xong', 'Đã tìm lại', 'Đã hủy thẻ'];

  const { data: openReports, error: openReportErr } = await supabase
    .from('card_lost_log')
    .select('lost_report_id, status')
    .eq('card_id', finalCardId)
    .not('status', 'in', `(${CLOSED_LOST_STATUSES.map(s => `"${s}"`).join(',')})`)
    .limit(1);

  if (openReportErr) {
    throw new Error(openReportErr.message);
  }
  if (openReports && openReports.length > 0) {
    throw new Error(
      `Thẻ này đã có báo cáo mất thẻ đang được xử lý (mã: ${openReports[0].lost_report_id}). ` +
      `Vui lòng xử lý xong báo cáo cũ trước khi tạo báo cáo mới.`
    );
  }

  // Lấy thông tin thẻ để kiểm tra loại thẻ và trạng thái hiện tại
  const { data: cardObj, error: cardErr } = await supabase
    .from('card')
    .select('type, status')
    .eq('card_id', finalCardId)
    .maybeSingle();

  if (cardErr) {
    throw new Error(cardErr.message);
  }

  // Rule: không cho báo mất nếu thẻ đã bị khóa hoặc đã xóa từ trước
  if (cardObj?.status === 'Đã khóa') {
    throw new Error("Thẻ này đã bị khóa (có thể do đã có báo cáo mất thẻ trước đó). Không thể tạo báo cáo mới.");
  }
  if (cardObj?.status === 'Đã xóa') {
    throw new Error("Thẻ này đã bị xóa khỏi hệ thống, không thể báo mất.");
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
      status: 'Đang chờ',             // Mặc định trạng thái ban đầu (khớp default DB)
      handled_by: null              // Chưa có nhân viên xử lý
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // 4. RULE #1 - Khóa thẻ ngay lập tức để chặn ra/vào cổng bằng thẻ đã báo mất
  //    Đây là bước bảo mật bắt buộc, thực hiện ngay sau khi ghi nhận báo cáo thành công.
  const { error: lockErr } = await supabase
    .from('card')
    .update({ status: 'Đã khóa' })
    .eq('card_id', finalCardId);

  if (lockErr) {
    // Báo cáo mất thẻ đã được ghi nhận, nhưng việc khóa thẻ thất bại -> cần cảnh báo rõ ràng
    // để nhân viên xử lý thủ công, tránh để thẻ bị mất mà vẫn ở trạng thái Hoạt động.
    console.error("Lỗi khi khóa thẻ sau khi ghi nhận báo mất:", lockErr.message);
    throw new Error(
      `Đã ghi nhận báo mất thẻ nhưng KHÔNG khóa được thẻ (lỗi: ${lockErr.message}). ` +
      `Vui lòng khóa thẻ thủ công ngay để đảm bảo an toàn.`
    );
  }

  // 5. RULE #3 - Ghi audit trail vào card_activity_logs cho thao tác khóa thẻ.
  //    Không throw nếu bước này lỗi (không nên chặn nghiệp vụ chính vì audit log lỗi),
  //    chỉ log ra console để theo dõi/khắc phục sau.
  const { data: regForAudit } = await supabase
    .from('card_registrations')
    .select('registration_id')
    .eq('card_id', finalCardId)
    .eq('vehicle_id', vehicle.vehicle_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error: auditErr } = await supabase
    .from('card_activity_logs')
    .insert({
      card_id: finalCardId,
      registration_id: regForAudit?.registration_id ?? null,
      action: 'CARD_LOCKED',
      plate_number,
      old_data: { status: cardObj?.status ?? null },
      new_data: { status: 'Đã khóa' },
      note: `Khóa thẻ tự động do báo mất - report ${data.lost_report_id}. Lý do: ${description || "Báo mất thẻ"}`,
      performed_by: performedBy
    });

  if (auditErr) {
    console.error("Lỗi khi ghi audit log card_activity_logs:", auditErr.message);
  }

  return data;
};

/**
 * RULE #4a - Tiếp nhận xử lý một báo cáo mất thẻ.
 * Chuyển trạng thái report từ 'Đang chờ' -> 'Đang xử lý' một cách TƯỜNG MINH,
 * thay vì suy luận ngầm qua handled_by như getLostCards đang làm hiện tại.
 * Chỉ cho phép tiếp nhận report đang ở đúng trạng thái 'Đang chờ' (mặc định khi mới tạo).
 */
export const acceptLostCardReport = async ({ reportId, performedBy }) => {
  if (!reportId) throw new Error("Thiếu mã báo cáo mất thẻ.");
  if (!performedBy) throw new Error("Thiếu thông tin người thực hiện.");

  const { data: report, error: reportErr } = await supabase
    .from('card_lost_log')
    .select('lost_report_id, status, handled_by')
    .eq('lost_report_id', reportId)
    .maybeSingle();

  if (reportErr) throw new Error(reportErr.message);
  if (!report) throw new Error("Không tìm thấy báo cáo mất thẻ.");

  // Chấp nhận cả 'Đang chờ' (mới) lẫn 'Chờ xử lý' (legacy) để tương thích dữ liệu cũ
  const PENDING_STATUSES = ['Đang chờ', 'Chờ xử lý'];
  if (!PENDING_STATUSES.includes(report.status)) {
    throw new Error(`Chỉ có thể tiếp nhận report ở trạng thái 'Đang chờ' (hiện tại: '${report.status}').`);
  }

  const { data: updated, error: updateErr } = await supabase
    .from('card_lost_log')
    .update({ status: 'Đang xử lý', handled_by: performedBy })
    .eq('lost_report_id', reportId)
    .select()
    .single();

  if (updateErr) throw new Error(updateErr.message);
  return updated;
};

/**
 * RULE #4b - Đóng một báo cáo mất thẻ, bắt buộc phải chọn 1 trong 2 hướng xử lý:
 *  - resolution = 'FOUND'     : Tìm lại được thẻ -> mở khóa thẻ, khôi phục Hoạt động.
 *  - resolution = 'CANCELLED' : Hủy thẻ vĩnh viễn -> soft-delete thẻ (không thể hoàn tác qua flow này).
 * Chỉ cho phép đóng report đang ở trạng thái 'Đang xử lý' (tức đã được tiếp nhận qua
 * acceptLostCardReport trước đó) - không cho nhảy cóc từ 'Đang chờ' thẳng sang đóng.
 */
export const resolveLostCardReport = async ({ reportId, performedBy, resolution, note }) => {
  if (!reportId) throw new Error("Thiếu mã báo cáo mất thẻ.");
  if (!performedBy) throw new Error("Thiếu thông tin người thực hiện.");
  if (!['FOUND', 'CANCELLED'].includes(resolution)) {
    throw new Error("resolution phải là 'FOUND' (tìm lại thẻ) hoặc 'CANCELLED' (hủy thẻ).");
  }

  const { data: report, error: reportErr } = await supabase
    .from('card_lost_log')
    .select('lost_report_id, card_id, vehicle_id, status, handled_by')
    .eq('lost_report_id', reportId)
    .maybeSingle();

  if (reportErr) throw new Error(reportErr.message);
  if (!report) throw new Error("Không tìm thấy báo cáo mất thẻ.");

  if (report.status !== 'Đang xử lý') {
    throw new Error(
      `Chỉ có thể đóng report đã được tiếp nhận (trạng thái 'Đang xử lý'). ` +
      `Trạng thái hiện tại: '${report.status}'. Vui lòng tiếp nhận xử lý trước.`
    );
  }

  const { data: cardObj, error: cardErr } = await supabase
    .from('card')
    .select('status')
    .eq('card_id', report.card_id)
    .maybeSingle();

  if (cardErr) throw new Error(cardErr.message);

  const { data: regForAudit } = await supabase
    .from('card_registrations')
    .select('registration_id')
    .eq('card_id', report.card_id)
    .eq('vehicle_id', report.vehicle_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Lấy plate_number để điền vào card_activity_logs cho dễ tra cứu (cột có sẵn trong schema)
  let plateForAudit = null;
  if (report.vehicle_id) {
    const { data: vehicleForAudit } = await supabase
      .from('vehicle')
      .select('plate_number')
      .eq('vehicle_id', report.vehicle_id)
      .maybeSingle();
    plateForAudit = vehicleForAudit?.plate_number ?? null;
  }

  if (resolution === 'FOUND') {
    // Tìm lại thẻ -> mở khóa, khôi phục Hoạt động
    const { error: unlockErr } = await supabase
      .from('card')
      .update({ status: 'Hoạt động' })
      .eq('card_id', report.card_id);

    if (unlockErr) throw new Error(unlockErr.message);

    await supabase.from('card_activity_logs').insert({
      card_id: report.card_id,
      registration_id: regForAudit?.registration_id ?? null,
      action: 'CARD_UNLOCKED',
      plate_number: plateForAudit,
      old_data: { status: cardObj?.status ?? null },
      new_data: { status: 'Hoạt động' },
      note: note || `Tìm lại được thẻ - đóng report ${reportId}`,
      performed_by: performedBy
    });

    const { data: closedReport, error: closeErr } = await supabase
      .from('card_lost_log')
      .update({ status: 'Đã tìm lại' })
      .eq('lost_report_id', reportId)
      .select()
      .single();

    if (closeErr) throw new Error(closeErr.message);
    return closedReport;
  }

  // resolution === 'CANCELLED' -> hủy thẻ vĩnh viễn (soft delete)
  const { error: cancelErr } = await supabase
    .from('card')
    .update({
      status: 'Đã xóa',
      deleted_at: new Date().toISOString(),
      deleted_by: performedBy
    })
    .eq('card_id', report.card_id);

  if (cancelErr) throw new Error(cancelErr.message);

  await supabase.from('card_activity_logs').insert({
    card_id: report.card_id,
    registration_id: regForAudit?.registration_id ?? null,
    action: 'CARD_DELETED',
    plate_number: plateForAudit,
    old_data: { status: cardObj?.status ?? null },
    new_data: { status: 'Đã xóa' },
    note: note || `Hủy thẻ vĩnh viễn do mất thẻ - đóng report ${reportId}`,
    performed_by: performedBy
  });

  const { data: closedReport, error: closeErr } = await supabase
    .from('card_lost_log')
    .update({ status: 'Đã hủy thẻ' })
    .eq('lost_report_id', reportId)
    .select()
    .single();

  if (closeErr) throw new Error(closeErr.message);

  // LƯU Ý: thẻ đã bị hủy vĩnh viễn -> nếu khách hàng cần tiếp tục gửi xe,
  // cần gọi API tạo thẻ mới (createCard) riêng cho vehicle_id này. Hàm này
  // KHÔNG tự động cấp thẻ mới để tránh phát sinh chi phí/thẻ ngoài ý muốn
  // của nhân viên - việc cấp thẻ mới nên là một hành động tường minh, có
  // thể đi kèm thu phí cấp lại thẻ (xem rule #5).
  return closedReport;
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