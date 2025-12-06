import { createClient } from '@supabase/supabase-js';

const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const SUPERBASE_URL = 'https://capmwpaelrfdwmljlmbv.supabase.co';

export const supabaseClient = createClient(SUPERBASE_URL, SUPABASE_PUBLISHABLE_KEY);
