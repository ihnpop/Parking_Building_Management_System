const { supabase } = require('../config/supabase');
const AppError = require('../utils/app-error');

class AuthService {
  /**
   * Login user with email and password using Supabase Auth
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<{token: string, user: object}>}
   */
  async login(email, password) {
    // 1) Authenticate user credentials with Supabase GoTrue Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw new AppError('Invalid email or password', 401);
    }

    const { session, user } = data;

    // 2) Fetch user details from public profiles table (role mapping)
    const { data: profile, error: dbError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, is_active')
      .eq('id', user.id)
      .single();

    if (dbError || !profile) {
      throw new AppError('User profile record not found in system database.', 404);
    }

    if (!profile.is_active) {
      throw new AppError('Your account has been suspended by an administrator.', 403);
    }

    return {
      token: session.access_token,
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role
      }
    };
  }

  /**
   * Log out user from Supabase session
   * @param {string} token 
   * @returns {Promise<void>}
   */
  async logout(token) {
    // In Express, signOut is primarily handled client-side by discarding the token.
    // However, we can notify the Supabase server-side engine to invalidate the active JWT.
    // Since supabase client is stateless in Express, we execute the admin signout function using token.
    const { error } = await supabase.auth.admin.signOut(token);
    if (error) {
      console.warn('Supabase signout warning:', error.message);
    }
  }
}

module.exports = new AuthService();
