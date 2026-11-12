/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL del proyecto Supabase, por ejemplo https://xxxxx.supabase.co */
  readonly VITE_SUPABASE_URL?: string;
  /** Clave pública (anon/publishable). Nunca la service_role. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}
