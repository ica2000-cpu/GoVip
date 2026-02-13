import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// --- MOCK CLIENT FOR BUILD TIME ---
// This ensures the build doesn't crash if env vars are missing.
const createMockClient = () => {
  console.warn('⚠️ Creating MOCK Supabase Client due to missing env vars');
  
  const mockChain = () => ({
    select: mockChain,
    insert: mockChain,
    update: mockChain,
    delete: mockChain,
    eq: mockChain,
    neq: mockChain,
    gt: mockChain,
    lt: mockChain,
    gte: mockChain,
    lte: mockChain,
    in: mockChain,
    is: mockChain,
    like: mockChain,
    ilike: mockChain,
    contains: mockChain,
    order: mockChain,
    limit: mockChain,
    single: () => Promise.resolve({ data: null, error: { message: 'Mock Client: Env vars missing' } }),
    maybeSingle: () => Promise.resolve({ data: null, error: { message: 'Mock Client: Env vars missing' } }),
    then: (resolve: any) => Promise.resolve({ data: [], error: { message: 'Mock Client: Env vars missing' } }).then(resolve)
  });

  return {
    from: () => mockChain(),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Mock Auth' } }),
      signOut: () => Promise.resolve({ error: null }),
      admin: {
          createUser: () => Promise.resolve({ data: { user: null }, error: { message: 'Mock Admin' } }),
          deleteUser: () => Promise.resolve({ data: {}, error: null }),
          getUserById: () => Promise.resolve({ data: { user: null }, error: null }),
          updateUserById: () => Promise.resolve({ data: { user: null }, error: null }),
      }
    },
    rpc: () => Promise.resolve({ data: null, error: { message: 'Mock RPC' } })
  } as any;
};

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Supabase Environment Variables missing!');
  if (typeof window === 'undefined') {
     console.error('Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel Settings.');
  }
}

// Avoid initializing if environment variables are missing during build time
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : createMockClient();

// Cliente con permisos de administrador (Service Role) - SOLO usar en el servidor
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
  : createMockClient();
