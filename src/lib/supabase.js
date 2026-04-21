import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// TODO: "Supabase not configured" errors occur when VITE_SUPABASE_URL and
// VITE_SUPABASE_ANON_KEY are missing from .env.local. Copy .env.local.example
// and fill in valid Supabase project credentials before auth/cloud sync will work.
export const supabase = url && key ? createClient(url, key) : null;
