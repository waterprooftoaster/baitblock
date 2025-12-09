import { createClient } from '@supabase/supabase-js';

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const SUPERBASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export const supabaseClient = createClient(SUPERBASE_URL, SUPABASE_ANON_KEY);
