const { supabase, supabaseAdmin } = require('../config/supabase');
const AppError = require('../utils/app-error');

class UserRepository {
  /**
   * Fetch all user profiles with pagination, sorting, and filtering
   */
  async getAll({ limit, offset, sortBy, sortOrder, filters }) {
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' });

    // Apply exact filter queries dynamically
    if (filters.role) query = query.eq('role', filters.role);
    if (filters.is_active !== undefined) query = query.eq('is_active', filters.is_active === 'true');
    if (filters.search) {
      query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }

    // Apply sorting and pagination bounds
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw new AppError(error.message, 500);

    return { data, count };
  }

  /**
   * Retrieve single user profile by id
   */
  async getById(id) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new AppError('User profile not found.', 404);
    return data;
  }

  /**
   * Create new auth credential and let db trigger populate profiles table
   */
  async create({ email, password, full_name, role }) {
    if (!supabaseAdmin) {
      throw new AppError('Admin Auth credentials are not configured on this server.', 500);
    }

    // Register user in Supabase Auth using the secret Service Role Key client
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role }
    });

    if (error) throw new AppError(error.message, 400);

    // Fetch the public profile that was automatically created by database trigger
    const profile = await this.getById(data.user.id);
    return profile;
  }

  /**
   * Update public user profile columns
   */
  async update(id, { full_name, role }) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ full_name, role })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return data;
  }

  /**
   * Toggle is_active status of user profile
   */
  async updateStatus(id, isActive) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return data;
  }
}

module.exports = new UserRepository();
