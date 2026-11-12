/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL del proyecto de Supabase (Project Settings → API). Sin ella la app corre en modo demo. */
  readonly VITE_SUPABASE_URL?: string;
  /** Clave pública "anon" o "publishable" del proyecto. Nunca la service_role. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
