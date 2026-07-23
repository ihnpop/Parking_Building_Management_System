import supabase from "../config/supabaseClient.js";

/**
 * Tìm thông tin đăng ký thẻ cùng thông tin chi tiết xe, khách hàng và thẻ
 * @param {string} registrationId 
 * @returns {Promise<object|null>}
 */
export const findRegistrationWithCard = async (registrationId) => {
  const { data: reg, error } = await supabase
    .from('card_registrations')
    .select(`
      registration_id,
      status,
      created_at,
      card_id,
      vehicle_id,
      vehicle (
        plate_number,
        customer (
          full_name
        )
      )
    `)
    .eq('registration_id', registrationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!reg) return null;

  const { data: card, error: cardError } = await supabase
    .from('card')
    .select(`
      card_id,
      code,
      type,
      expired_date,
      status,
      created_at
    `)
    .eq('card_id', reg.card_id)
    .maybeSingle();

  if (cardError) throw new Error(cardError.message);
  reg.card = card;
  return reg;
};

/**
 * Cập nhật hạn ngày hết hạn của thẻ
 * @param {string} cardId 
 * @param {string} newExpiredDate 
 * @returns {Promise<object>}
 */
export const updateCardExpirationDate = async (cardId, newExpiredDate) => {
  const { data, error } = await supabase
    .from('card')
    .update({ expired_date: newExpiredDate })
    .eq('card_id', cardId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Tìm thẻ theo card_id (chỉ lấy thẻ chưa bị xóa)
 * @param {string} cardId
 * @returns {Promise<object|null>}
 */
export const findById = async (cardId) => {
  const { data, error } = await supabase
    .from('card')
    .select('*')
    .eq('card_id', cardId)
    .is('deleted_at', null)
    .single();

  if (error) return null;
  return data;
};

/**
 * Xóa mềm một thẻ (đánh dấu deleted_at, deleted_by, chuyển status sang Đã khóa)
 * @param {string} cardId
 * @param {string} performedBy
 * @returns {Promise<object>}
 */
export const softDelete = async (cardId, performedBy) => {
  const { data, error } = await supabase
    .from('card')
    .update({
      status: 'Đã khóa',
      deleted_at: new Date().toISOString(),
      deleted_by: performedBy,
    })
    .eq('card_id', cardId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Lấy danh sách payment theo order_codes
 * @param {string[]} orderCodes
 * @returns {Promise<object[]>}
 */
export const getPaymentsByOrderCodes = async (orderCodes) => {
  if (!orderCodes || orderCodes.length === 0) return [];
  const { data, error } = await supabase
    .from('payment')
    .select('order_code, payment_method, status, amount, transaction_no, paid_at')
    .in('order_code', orderCodes);

  if (error) throw new Error(error.message);
  return data || [];
};

/**
 * Ghi log hoạt động đơn giản cho thẻ (dùng riêng cho xóa thẻ)
 * @param {object} payload - { card_id, action, performed_by, note }
 * @returns {Promise<void>}
 */
export const logActivity = async ({ card_id, action, performed_by, note }) => {
  const { error } = await supabase
    .from('card_activity_logs')
    .insert({
      card_id,
      action,
      performed_by,
      note: note || null,
      performed_at: new Date().toISOString(),
    });

  if (error) throw new Error(error.message);
};

/**
 * Chèn một bản ghi hoạt động thẻ mới vào card_activity_logs
 * @param {object} logPayload
 * @returns {Promise<object>}
 */
export const createActivityLog = async ({
  cardId,
  registrationId,
  action,
  plateNumber,
  customerName,
  durationMonths,
  amount,
  expiredDateBefore,
  expiredDateAfter,
  oldData,
  newData,
  note,
  performedBy
}) => {
  const { data, error } = await supabase
    .from('card_activity_logs')
    .insert({
      card_id: cardId,
      registration_id: registrationId,
      action,
      plate_number: plateNumber || null,
      customer_name: customerName || null,
      duration_months: durationMonths || null,
      amount: amount || null,
      expired_date_before: expiredDateBefore || null,
      expired_date_after: expiredDateAfter || null,
      old_data: oldData || null,
      new_data: newData || null,
      note: note || null,
      performed_by: performedBy || null,
      performed_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};



/**
 * Tìm khách hàng theo số điện thoại
 * @param {string} phone
 * @returns {Promise<object|null>}
 */
export const findCustomerByPhone = async (phone) => {
  const { data, error } = await supabase
    .from('customer')
    .select('customer_id, full_name, phone, email')
    .eq('phone', phone)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Tạo mới khách hàng
 * @param {object} payload - { fullName, phone, email }
 * @returns {Promise<object>}
 */
export const createCustomer = async ({ fullName, phone, email }) => {
  const { data, error } = await supabase
    .from('customer')
    .insert({
      full_name: fullName,
      phone: phone || null,
      email: email || null
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Tìm xe theo biển số
 * @param {string} plate
 * @returns {Promise<object|null>}
 */
export const findVehicleByPlate = async (plate) => {
  const { data, error } = await supabase
    .from('vehicle')
    .select('vehicle_id, plate_number, customer_id')
    .eq('plate_number', plate)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Tạo mới xe
 * @param {object} payload - { plate, customerId }
 * @returns {Promise<object>}
 */
export const createVehicle = async ({ plate, customerId, vehicleTypeId }) => {
  const { data, error } = await supabase
    .from('vehicle')
    .insert({
      plate_number: plate,
      customer_id: customerId,
      vehicle_type_id: vehicleTypeId
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Kiểm tra xe có đăng ký thẻ đang hoạt động không (trả về registration kèm mã thẻ nếu có)
 * @param {string} vehicleId
 * @returns {Promise<object|null>}
 */
export const findActiveRegistrationByVehicle = async (vehicleId) => {
  const { data: reg, error } = await supabase
    .from('card_registrations')
    .select(`
      registration_id,
      card_id
    `)
    .eq('vehicle_id', vehicleId)
    .in('status', ['Hoạt động'])
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!reg) return null;

  const { data: card, error: cardError } = await supabase
    .from('card')
    .select('code')
    .eq('card_id', reg.card_id)
    .maybeSingle();

  if (cardError) throw new Error(cardError.message);
  reg.card = card;
  return reg;
};

/**
 * Tạo mới một thẻ (card)
 * @param {object} payload - { code, type, status, expiredDate }
 * @returns {Promise<object>}
 */
export const createCard = async ({ code, type, status, expiredDate }) => {
  const { data, error } = await supabase
    .from('card')
    .insert({
      code,
      type,
      status,
      expired_date: expiredDate
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Tạo mới một đăng ký thẻ (card_registrations)
 * @param {object} payload - { cardId, vehicleId, status }
 * @returns {Promise<object>}
 */
export const createRegistration = async ({ cardId, vehicleId, status }) => {
  const { data, error } = await supabase
    .from('card_registrations')
    .insert({
      card_id: cardId,
      vehicle_id: vehicleId,
      status
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Đếm số lượng thẻ đã tồn tại (dùng để sinh mã thẻ tự động)
 * @returns {Promise<number>}
 */
export const countCards = async () => {
  const { count, error } = await supabase
    .from('card')
    .select('card_id', { count: 'exact', head: true });

  if (error) throw new Error(error.message);
  return count || 0;
};

/**
 * Sinh mã thẻ MONTH tiếp theo đảm bảo không trùng trong DB
 * Định dạng: MONTH0001 → MONTH9999 rồi MONTH10000 → MONTH99999
 * @returns {Promise<string>}
 */
export const generateNextMonthCode = async () => {
  // Lấy tất cả mã MONTH hiện có, sắp xếp để tìm số lớn nhất
  const { data, error } = await supabase
    .from('card')
    .select('code')
    .like('code', 'MONTH%')
    .order('code', { ascending: false });

  if (error) throw new Error(error.message);

  let maxNumber = 0;
  if (data && data.length > 0) {
    for (const row of data) {
      const numPart = row.code.replace(/^MONTH/, '');
      const num = parseInt(numPart, 10);
      if (!isNaN(num) && num > maxNumber) {
        maxNumber = num;
      }
    }
  }

  // Thử tìm mã chưa tồn tại bắt đầu từ maxNumber + 1
  let candidate = maxNumber + 1;
  let attempts = 0;
  while (attempts < 100) {
    // Dùng 4 chữ số nếu <= 9999, ngược lại dùng 5 chữ số
    const padded = candidate <= 9999
      ? String(candidate).padStart(4, '0')
      : String(candidate).padStart(5, '0');
    const code = `MONTH${padded}`;

    const { data: existing } = await supabase
      .from('card')
      .select('code')
      .eq('code', code)
      .maybeSingle();

    if (!existing) return code;
    candidate++;
    attempts++;
  }

  throw new Error('Không thể sinh mã thẻ MONTH duy nhất sau nhiều lần thử.');
};

/**
 * Cập nhật vehicle_id của một registration
 * @param {string} registrationId
 * @param {string} vehicleId
 * @returns {Promise<void>}
 */
export const updateRegistrationVehicle = async (registrationId, vehicleId) => {
  const { error } = await supabase
    .from('card_registrations')
    .update({ vehicle_id: vehicleId })
    .eq('registration_id', registrationId);

  if (error) throw new Error(error.message);
};

/**
 * Cập nhật biển số xe
 * @param {string} vehicleId
 * @param {string} plate
 * @returns {Promise<void>}
 */
export const updateVehiclePlate = async (vehicleId, plate) => {
  const { error } = await supabase
    .from('vehicle')
    .update({ plate_number: plate })
    .eq('vehicle_id', vehicleId);

  if (error) throw new Error(error.message);
};

/**
 * Lấy vehicle_package mới nhất của xe theo vehicle_id (sắp xếp end_date giảm dần)
 * @param {string} vehicleId
 * @returns {Promise<object|null>}
 */
export const findLatestVehiclePackageByVehicle = async (vehicleId) => {
  const { data, error } = await supabase
    .from('vehicle_package')
    .select('vehicle_package_id')
    .eq('vehicle_id', vehicleId)
    .order('end_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Cập nhật vehicle_package
 * @param {string} vehiclePackageId
 * @param {object} payload
 * @returns {Promise<object>}
 */
export const updateVehiclePackage = async (vehiclePackageId, payload) => {
  const { data, error } = await supabase
    .from('vehicle_package')
    .update(payload)
    .eq('vehicle_package_id', vehiclePackageId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Tạo mới vehicle_package
 * @param {object} payload
 * @returns {Promise<object>}
 */
export const createVehiclePackage = async (payload) => {
  const { data, error } = await supabase
    .from('vehicle_package')
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Tìm payment trùng lặp dựa trên các điều kiện
 * @param {object} params
 * @returns {Promise<object|null>}
 */
export const findDuplicatePayment = async ({ vehiclePackageId, paymentType, amount, sinceTime }) => {
  let query = supabase
    .from('payment')
    .select('payment_id')
    .eq('vehicle_package_id', vehiclePackageId)
    .eq('payment_type', paymentType)
    .gte('payment_time', sinceTime);

  if (amount !== undefined) {
    query = query.eq('amount', amount);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  return data;
};

/**
 * Tạo mới payment record
 * @param {object} payload
 * @returns {Promise<object>}
 */
export const createPayment = async (payload) => {
  const { data, error } = await supabase
    .from('payment')
    .insert(payload)
    .select()
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Cập nhật customer_id của xe
 * @param {string} vehicleId
 * @param {string} customerId
 * @returns {Promise<void>}
 */
export const updateVehicleCustomerId = async (vehicleId, customerId) => {
  const { error } = await supabase
    .from('vehicle')
    .update({ customer_id: customerId })
    .eq('vehicle_id', vehicleId);

  if (error) throw new Error(error.message);
};

/**
 * Tìm thẻ tháng có trạng thái 'Đang chờ'
 * @returns {Promise<object|null>}
 */
export const findPendingMonthCard = async () => {
  const { data, error } = await supabase
    .from('card')
    .select('*')
    .eq('type', 'Thẻ tháng')
    .eq('status', 'Đang chờ')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Cập nhật thông tin thẻ
 * @param {string} cardId
 * @param {object} payload
 * @returns {Promise<object>}
 */
export const updateCard = async (cardId, payload) => {
  const { data, error } = await supabase
    .from('card')
    .update(payload)
    .eq('card_id', cardId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Đếm số lượng thẻ tháng không ở trạng thái 'Đã xóa'
 * @returns {Promise<number>}
 */
export const countActiveMonthCards = async () => {
  const { count, error } = await supabase
    .from('card')
    .select('card_id', { count: 'exact', head: true })
    .eq('type', 'Thẻ tháng')
    .not('status', 'eq', 'Đã xóa');

  if (error) throw new Error(error.message);
  return count || 0;
};

/**
 * Tìm package của loại xe đang hoạt động
 * @param {string} vehicleTypeId
 * @param {number} duration
 * @returns {Promise<object|null>}
 */
export const findActivePackage = async (vehicleTypeId, duration) => {
  const { data, error } = await supabase
    .from('package')
    .select('package_id, price')
    .eq('vehicle_type_id', vehicleTypeId)
    .eq('duration_month', duration)
    .eq('status', 'Hoạt động')
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Lấy trạng thái của thẻ
 * @param {string} cardId
 * @returns {Promise<object|null>}
 */
export const findCardStatus = async (cardId) => {
  const { data, error } = await supabase
    .from('card')
    .select('status')
    .eq('card_id', cardId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Tìm liên kết đăng ký đang hoạt động theo card_id kèm thông tin customer_id
 * @param {string} cardId
 * @returns {Promise<object|null>}
 */
export const findActiveRegistrationWithCustomerByCard = async (cardId) => {
  const { data, error } = await supabase
    .from('card_registrations')
    .select(`
      registration_id,
      vehicle_id,
      vehicle (
        customer_id
      )
    `)
    .eq('card_id', cardId)
    .in('status', ['Hoạt động'])
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Cập nhật thông tin khách hàng ở bảng customer
 * @param {string} customerId
 * @param {object} payload
 * @returns {Promise<void>}
 */
export const updateCustomer = async (customerId, payload) => {
  const { error } = await supabase
    .from('customer')
    .update(payload)
    .eq('customer_id', customerId);

  if (error) throw new Error(error.message);
};

/**
 * Tìm phiên gửi xe mới nhất của xe
 * @param {string} vehicleId
 * @returns {Promise<object|null>}
 */
export const findLatestParkingSession = async (vehicleId) => {
  const { data, error } = await supabase
    .from('parking_sessions')
    .select('session_id')
    .eq('vehicle_id', vehicleId)
    .order('entry_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Cập nhật phiên gửi xe
 * @param {string} sessionId
 * @param {object} payload
 * @returns {Promise<void>}
 */
export const updateParkingSession = async (sessionId, payload) => {
  const { error } = await supabase
    .from('parking_sessions')
    .update(payload)
    .eq('session_id', sessionId);

  if (error) throw new Error(error.message);
};

/**
 * Lấy danh sách thẻ tháng cùng thông tin đăng ký xe và khách hàng
 * @returns {Promise<object[]>}
 */
export const getMonthCards = async () => {
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
        registration_id,
        status,
        created_at,
        vehicle (
          vehicle_id,
          plate_number,
          customer (
            customer_id,
            full_name,
            phone,
            email
          ),
          vehicle_type (
            name
          )
        )
      )
    `)
    .eq('type', 'Thẻ tháng')
    .not('status', 'eq', 'Đã xóa')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
};

/**
 * Lấy chi tiết phiên gửi xe mới nhất
 * @param {string} vehicleId
 * @returns {Promise<object|null>}
 */
export const getLatestParkingSessionDetail = async (vehicleId) => {
  const { data, error } = await supabase
    .from('parking_sessions')
    .select(`
      session_id,
      entry_time,
      exit_time
    `)
    .eq('vehicle_id', vehicleId)
    .order('entry_time', { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);
  return data?.[0] || null;
};

/**
 * Lấy lịch sử log hoạt động của thẻ tháng
 * @returns {Promise<object[]>}
 */
export const getMonthCardLogs = async () => {
  const { data, error } = await supabase
    .from('card_activity_logs')
    .select(`
      log_id,
      card_id,
      action,
      plate_number,
      customer_name,
      amount,
      duration_months,
      performed_at,
      note,
      new_data
    `)
    .in('action', ['Cấp mới', 'Gia hạn', 'Gia hạn nối tiếp', 'Tạo thẻ tháng mới', 'Đã gia hạn', 'Thẻ đã cấp lại'])
    .order('performed_at', { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return data || [];
};

/**
 * Lấy mã các thẻ tháng theo danh sách ID
 * @param {string[]} cardIds
 * @returns {Promise<object[]>}
 */
export const getCardsByIds = async (cardIds) => {
  const { data, error } = await supabase
    .from('card')
    .select('card_id, code')
    .in('card_id', cardIds);

  if (error) throw new Error(error.message);
  return data || [];
};

/**
 * Lấy đăng ký thẻ kèm thông tin khách hàng qua card_id
 * @param {string[]} cardIds
 * @returns {Promise<object[]>}
 */
export const getRegistrationsWithCustomerByCardIds = async (cardIds) => {
  const { data, error } = await supabase
    .from('card_registrations')
    .select(`
      card_id,
      vehicle (
        plate_number,
        customer (
          full_name
        )
      )
    `)
    .in('card_id', cardIds);

  if (error) throw new Error(error.message);
  return data || [];
};

/**
 * Lấy xe kèm thông tin khách hàng qua biển số xe
 * @param {string[]} plates
 * @returns {Promise<object[]>}
 */
export const getVehiclesWithCustomerByPlates = async (plates) => {
  const { data, error } = await supabase
    .from('vehicle')
    .select(`
      plate_number,
      customer (
        full_name
      )
    `)
    .in('plate_number', plates);

  if (error) throw new Error(error.message);
  return data || [];
};

/**
 * Tìm xe và đăng ký liên kết dựa vào biển số xe
 * @param {string} plate
 * @returns {Promise<object|null>}
 */
export const findVehicleWithRegistrationsByPlate = async (plate) => {
  const { data, error } = await supabase
    .from('vehicle')
    .select(`
      vehicle_id,
      vehicle_type_id,
      card_registrations (
        registration_id,
        status,
        card (
          card_id,
          code,
          type
        )
      )
    `)
    .eq('plate_number', plate)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Lấy chi tiết thông tin thẻ tháng để làm hợp đồng
 * @param {string} cardId
 * @returns {Promise<object>}
 */
export const getCardDetailsForContract = async (cardId) => {
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
        registration_id,
        status,
        created_at,
        vehicle (
          vehicle_id,
          plate_number,
          brand,
          color,
          customer (
            customer_id,
            full_name,
            phone,
            email
          ),
          vehicle_type (
            vehicle_type_id,
            name
          ),
          vehicle_package (
            vehicle_package_id,
            start_date,
            end_date,
            status,
            package_id
          )
        )
      )
    `)
    .eq('card_id', cardId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Lấy CCCD khách hàng
 * @param {string} customerId
 * @returns {Promise<object|null>}
 */
export const getCccdNumberByCustomerId = async (customerId) => {
  const { data, error } = await supabase
    .from('customer_kyc')
    .select('cccd_number')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Lấy package theo ID
 * @param {string} packageId
 * @returns {Promise<object|null>}
 */
export const getPackageById = async (packageId) => {
  const { data, error } = await supabase
    .from('package')
    .select('name, price, duration_month')
    .eq('package_id', packageId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Lấy payment mới nhất theo vehicle_package_id
 * @param {string} vehiclePackageId
 * @returns {Promise<object|null>}
 */
export const getLatestPaymentByVehiclePackage = async (vehiclePackageId) => {
  const { data, error } = await supabase
    .from('payment')
    .select('amount, payment_method, status, payment_time')
    .eq('vehicle_package_id', vehiclePackageId)
    .order('payment_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Lấy các giao dịch thẻ tháng đang chờ thanh toán hoặc đã hết hạn/thất bại
 * @returns {Promise<object[]>}
 */
export const getPendingAndExpiredMonthCardPayments = async () => {
  const { data, error } = await supabase
    .from('payment')
    .select('payment_id, order_code, payment_time, amount, payment_method, payment_type, note, status')
    .in('payment_type', ['Đăng ký vé tháng', 'Gia hạn vé tháng', 'Phí cấp lại thẻ'])
    .in('status', ['Chờ thanh toán', 'Hết hạn', 'Thất bại'])
    .order('payment_time', { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return data || [];
};

/**
 * Lấy thông tin xe (biển số + chủ xe) theo danh sách vehicle_id
 * @param {string[]} vehicleIds
 * @returns {Promise<object[]>}
 */
export const getVehiclesByIds = async (vehicleIds) => {
  if (!vehicleIds || vehicleIds.length === 0) return [];
  const { data, error } = await supabase
    .from('vehicle')
    .select(`
      vehicle_id,
      plate_number,
      customer (
        full_name
      )
    `)
    .in('vehicle_id', vehicleIds);

  if (error) throw new Error(error.message);
  return data || [];
};

/**
 * Lấy danh sách card_lost_log theo danh sách UUID (report_id)
 * @param {string[]} reportIds
 * @returns {Promise<object[]>}
 */
export const getLostReportsByIds = async (reportIds) => {
  if (!reportIds || reportIds.length === 0) return [];
  const validReportIds = reportIds.filter(id => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
  if (validReportIds.length === 0) return [];

  const { data, error } = await supabase
    .from('card_lost_log')
    .select('lost_report_id, card_id, vehicle_id')
    .in('lost_report_id', validReportIds);

  if (error) throw new Error(error.message);
  return data || [];
};

