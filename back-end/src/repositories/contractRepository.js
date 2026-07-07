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
    .select('*, card_registrations(*)')
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
    .single();

  if (error) throw new Error(error.message);
  return data;
};
