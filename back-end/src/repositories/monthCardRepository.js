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
 * Chèn một bản ghi hoạt động thẻ mới vào card_activity_logs
 * @param {object} logPayload
 * @returns {Promise<object>}
 */
export const createActivityLog = async ({
  cardId,
  registrationId,
  action,
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
      old_data: oldData,
      new_data: newData,
      note,
      performed_by: performedBy,
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
