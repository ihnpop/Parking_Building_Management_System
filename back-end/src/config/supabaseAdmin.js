import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

// QUAN TRỌNG: client này dùng SERVICE_ROLE_KEY, có toàn quyền (bypass RLS).
// CHỈ dùng ở backend, KHÔNG BAO GIỜ export/expose ra frontend.
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

export default supabaseAdmin;