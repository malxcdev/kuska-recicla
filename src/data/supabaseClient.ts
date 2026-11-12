/**
 * Cliente de Supabase. Solo se crea si el proyecto tiene configuradas las
 * variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function readEnv(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export const SUPABASE_URL = readEnv(import.meta.env.VITE_SUPABASE_URL);
export const SUPABASE_ANON_KEY = readEnv(import.meta.env.VITE_SUPABASE_ANON_KEY);

/** La anon key es pública por diseño: viaja en el bundle y RLS protege los datos. */
export const isSupabaseConfigured = /^https?:\/\//i.test(SUPABASE_URL) && SUPABASE_ANON_KEY.length > 20;

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase no está configurado: faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.");
  }
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "kuska:auth:v1",
    },
  });
  return client;
}
