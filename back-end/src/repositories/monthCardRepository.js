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
