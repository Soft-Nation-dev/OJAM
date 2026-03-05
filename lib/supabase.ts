import { createClient } from "@supabase/supabase-js";

const fallbackSupabaseUrl = "https://lrlbygqbtylnrfsbgdkp.supabase.co";
const fallbackSupabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxybGJ5Z3FidHlsbnJmc2JnZGtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NjY1MzMsImV4cCI6MjA4NDA0MjUzM30.XwEwvv2xoEqPCeAQzHTQDCr1Bil0FcpkCuIOWFEJvm4";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? fallbackSupabaseUrl;
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? fallbackSupabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const WORKER_URL = "https://sermon-sync.ojam.workers.dev";
