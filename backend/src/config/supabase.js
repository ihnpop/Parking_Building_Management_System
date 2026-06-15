const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'placeholder';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (supabaseUrl === 'https://placeholder.supabase.co') {
  console.warn('⚠️ WARNING: Supabase URL has not been configured in the environment variables yet.');
}

// Client instance utilizing anonymous key (Default database queries)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client instance utilizing service role key (Admin operations bypassing RLS)
const supabaseAdmin = supabaseServiceRoleKey 
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

module.exports = {
  supabase,
  supabaseAdmin
};
