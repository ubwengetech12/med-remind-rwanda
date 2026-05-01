import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// Sets RLS session context so each pharmacy only sees their own data
export async function setSupabaseContext(userId: string, role: string) {
  await supabase.rpc('set_app_context', {
    p_user_id: userId,
    p_role: role,
    p_pharmacy_id: role === 'pharmacist' ? userId : '',
  });
}