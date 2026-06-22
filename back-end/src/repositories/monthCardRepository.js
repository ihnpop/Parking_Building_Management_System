import supabase from "../config/supabaseClient.js";

/**
 * Tìm thông tin đăng ký thẻ cùng thông tin chi tiết xe, khách hàng và thẻ
 * @param {string} registrationId 
 * @returns {Promise<object|null>}
 */
export const findRegistrationWithCard = async (registrationId) => {
  const { data, error } = await supabase
    .from('card_registrations')
    .select(`
      registration_id,
      status,
      created_at,
      card_id,
      card (
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
        )
      )
    `)
    .eq('registration_id', registrationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
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
// export const createVehicle = async ({ plate, customerId }) => {
//   const { data, error } = await supabase
//     .from('vehicle')
//     .insert({
//       plate_number: plate,
//       customer_id: customerId
//     })
//     .select()
//     .single();

//   if (error) throw new Error(error.message);
//   return data;
// };  

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
  const { data, error } = await supabase
    .from('card_registrations')
    .select(`
      registration_id,
      card_id,
      card ( code )
    `)
    .eq('vehicle_id', vehicleId)
    .in('status', ['Hoạt động'])
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
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
