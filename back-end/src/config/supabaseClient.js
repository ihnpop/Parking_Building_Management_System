// import { createClient } from "@supabase/supabase-js";

// const supabaseUrl =
//     import.meta.env.SUPABASE_URL;

// const supabaseKey =
//     import.meta.env.SUPABASE_ANON_KEY;

// export const supabase =
//     createClient(
//         supabaseUrl,
//         supabaseKey
//     );

import { createClient } from "@supabase/supabase-js";

import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(

    process.env.SUPABASE_URL,

    process.env.SUPABASE_ANON_KEY
);

export default supabase;