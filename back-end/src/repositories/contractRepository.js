import supabase from "../config/supabaseClient.js";

/**
 * Tạo một bản ghi hợp đồng mới
 * @param {object} contractData 
 * @returns {Promise<object>}
 */
export const createContract = async (contractData) => {
  const { data, error } = await supabase
    .from('contract')
    .insert({
      registration_id: contractData.registrationId,
      contract_no: contractData.contractNo,
      status: contractData.status || 'Chờ ký',
      sign_token: contractData.signToken,
      token_expires_at: contractData.tokenExpiresAt,
      sent_at: contractData.sentAt || new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Tìm hợp đồng theo token để khách hàng ký
 * @param {string} token 
 * @returns {Promise<object|null>}
 */
export const findByToken = async (token) => {
  const { data, error } = await supabase
    .from('contract')
    .select(`
      *,
      card_registrations (
        registration_id,
        card_id,
        vehicle_id,
        status
      )
    `)
    .eq('sign_token', token)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Tìm hợp đồng theo registration_id
 * @param {string} registrationId 
 * @returns {Promise<object|null>}
 */
export const findByRegistrationId = async (registrationId) => {
  const { data, error } = await supabase
    .from('contract')
    .select('*')
    .eq('registration_id', registrationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Cập nhật thông tin hợp đồng
 * @param {string} contractId 
 * @param {object} updates 
 * @returns {Promise<object>}
 */
export const updateContract = async (contractId, updates) => {
  const { data, error } = await supabase
    .from('contract')
    .update(updates)
    .eq('contract_id', contractId)
    .select()
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Không tìm thấy hợp đồng với ID: ${contractId}`);
  return data;
};

/**
 * Lấy chi tiết thông tin đăng ký để phục vụ tạo hợp đồng
 * @param {string} registrationId
 * @returns {Promise<object>}
 */
export const getRegistrationDetails = async (registrationId) => {
  const { data, error } = await supabase
    .from('card_registrations')
    .select(`
      registration_id,
      status,
      created_at,
      card_id,
      vehicle_id,
      vehicle (
        plate_number,
        vehicle_type (
          name
        ),
        customer (
          customer_id,
          full_name,
          phone,
          email
        )
      ),
      card (
        code,
        type,
        expired_date
      )
    `)
    .eq('registration_id', registrationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Không tìm thấy thông tin đăng ký thẻ.");
  return data;
};

/**
 * Lấy chi tiết thẻ phục vụ hiển thị hợp đồng
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
