import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const missingSupabaseEnv = !supabaseUrl || !supabaseAnonKey;

const missingSupabaseError = {
  message:
    "Supabase is disabled. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.",
};

function createDisabledSupabaseClient() {
  const createQuery = () => {
    const query: any = {
      data: null,
      error: missingSupabaseError,
      select: () => query,
      eq: () => query,
      order: () => query,
      update: () => query,
      delete: () => query,
      single: async () => ({ data: null, error: missingSupabaseError }),
      maybeSingle: async () => ({ data: null, error: null }),
      insert: async () => ({ data: null, error: missingSupabaseError }),
    };

    return query;
  };

  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe: () => {},
          },
        },
      }),
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: missingSupabaseError,
      }),
      signUp: async () => ({
        data: { user: null, session: null },
        error: missingSupabaseError,
      }),
      signOut: async () => ({ error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
    },
    from: () => createQuery(),
  };
}

if (missingSupabaseEnv) {
  console.warn(
    "Missing Supabase env vars. Running with Supabase disabled. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

export const supabase: any = missingSupabaseEnv
  ? createDisabledSupabaseClient()
  : createClient(supabaseUrl, supabaseAnonKey);
export const WORKER_URL = "https://sermon-sync.ojam.workers.dev";
