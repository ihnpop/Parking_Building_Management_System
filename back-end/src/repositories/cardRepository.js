import supabase from "../config/supabaseClient.js";

/**
 * Tìm kiếm thông tin thẻ theo card_id
 * @param {string} cardId 
 * @returns {Promise<object|null>}
 */
export const findById = async (cardId) => {
  const { data, error } = await supabase
    .from('card')
    .select('*')
    .eq('card_id', cardId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Xóa mềm thẻ (Soft Delete)
 * @param {string} cardId 
 * @param {string} currentUserId 
 * @returns {Promise<object>}
 */
export const softDelete = async (cardId, currentUserId) => {
  const { data, error } = await supabase
    .from('card')
    .update({
      status: 'Đã xóa',
      deleted_at: new Date().toISOString(),
      deleted_by: currentUserId || null
    })
    .eq('card_id', cardId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};
