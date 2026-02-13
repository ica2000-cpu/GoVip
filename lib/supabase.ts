import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Supabase Environment Variables missing!');
  if (typeof window === 'undefined') {
     console.error('Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel Settings.');
  }
}

// Avoid initializing if environment variables are missing during build time
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null as any;

// Cliente con permisos de administrador (Service Role) - SOLO usar en el servidor
// IMPORTANTE: Nunca exponer esta clave en el cliente (browser)
if (!supabaseServiceRoleKey && typeof window === 'undefined') {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY is missing. Admin operations might fail or fallback to Anon (which will likely fail RLS).');
}

export const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : (null as any);
