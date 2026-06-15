const { supabase } = require('../config/supabase');
const AppError = require('../utils/app-error');

/**
 * Protect routes by verifying JWT Bearer tokens from request headers
 */
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // 1) Verify presence of authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('You are not logged in. Please provide an auth token.', 401));
    }

    // 2) Validate token signature against Supabase Auth engine
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return next(new AppError('Session invalid or expired. Access denied.', 401));
    }

    // 3) Retrieve roles mapping from profiles database table
    const { data: profile, error: dbError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, is_active')
      .eq('id', user.id)
      .single();

    if (dbError || !profile) {
      return next(new AppError('User profile details not found in system record database.', 404));
    }

    if (!profile.is_active) {
      return next(new AppError('Your account has been suspended by an administrator.', 403));
    }

    // 4) Map user information directly to current request scope
    req.user = profile;
    next();
  } catch (err) {
    next(err);
  }
};
